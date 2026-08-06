import { getFirebaseIdToken } from "@/lib/firebase/client";
import { API_BASE_URL } from "@/lib/utils/api-client";
import type { FinalOnboardingPayload, OnboardingSubmission } from "@/types/onboarding";

type SubmitOnboardingResult = {
  success: boolean;
  error?: string;
};

function parseOnboardingFormData(formData: FormData): FinalOnboardingPayload {
  const rawPayload = formData.get("payload");

  if (typeof rawPayload !== "string") {
    throw new Error("Onboarding payload is missing.");
  }

  const parsedPayload = JSON.parse(rawPayload) as OnboardingSubmission;
  const resumeEntry = formData.get("resume_file");
  const resumeFile = resumeEntry instanceof File && resumeEntry.size > 0 ? resumeEntry : null;

  if (parsedPayload.career_profile) {
    return {
      ...parsedPayload,
      career_profile: {
        ...parsedPayload.career_profile,
        resume_file: resumeFile,
      },
    };
  }

  if (parsedPayload.high_school_profile) {
    return {
      ...parsedPayload,
      high_school_profile: {
        ...parsedPayload.high_school_profile,
        resume_file: resumeFile,
      },
    };
  }

  return parsedPayload;
}

// This used to be a Next.js Server Action writing straight to Supabase
// (anon key + RLS keyed on the Supabase session cookie). Now that auth is
// Firebase (no server-side session yns-web can read), this runs client-side
// and calls yns-api directly with a Firebase ID token, the same pattern
// already used by lib/services/interview-assistant.ts.
export async function submitOnboarding(formData: FormData): Promise<SubmitOnboardingResult> {
  try {
    // Re-parses and re-serializes to strip the resume file back into a
    // single well-known form field name (resume_file), same shape the API
    // expects — the caller (OnboardingForm.tsx) builds this FormData with a
    // JSON "payload" field plus the raw file, mirroring the old shape.
    const data = parseOnboardingFormData(formData);
    const resumeFile = data.career_profile?.resume_file ?? data.high_school_profile?.resume_file ?? null;

    const token = await getFirebaseIdToken();
    if (!token) {
      return { success: false, error: "You must be signed in before completing onboarding." };
    }

    const { career_profile, high_school_profile, ...rest } = data;
    const payload = {
      ...rest,
      ...(career_profile ? { career_profile: { ...career_profile, resume_file: undefined } } : {}),
      ...(high_school_profile ? { high_school_profile: { ...high_school_profile, resume_file: undefined } } : {}),
    };

    const submitFormData = new FormData();
    submitFormData.set("payload", JSON.stringify(payload));
    if (resumeFile) {
      submitFormData.set("resume_file", resumeFile);
    }

    const response = await fetch(`${API_BASE_URL}/api/onboarding/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: submitFormData,
    });

    const result = (await response.json()) as SubmitOnboardingResult;

    if (!response.ok || !result.success) {
      return { success: false, error: result.error ?? `Onboarding submission failed: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to submit onboarding.",
    };
  }
}
