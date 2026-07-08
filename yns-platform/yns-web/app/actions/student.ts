'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinalOnboardingPayload, UserType } from "@/types/onboarding";

type SubmitOnboardingResult = {
  success: boolean;
  error?: string;
};

type DatabaseUserType =
  | "high_school"
  | "college_student"
  | "recent_graduate";

function getSafeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function toDatabaseUserType(userType: UserType): DatabaseUserType {
  const userTypeMap: Record<UserType, DatabaseUserType> = {
    high_school: "high_school",
    college: "college_student",
    recent_grad: "recent_graduate",
  };

  return userTypeMap[userType];
}

function formatSupabaseError(action: string, message: string) {
  return `${action}: ${message}`;
}

export async function submitOnboarding(data: FinalOnboardingPayload): Promise<SubmitOnboardingResult> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && userError.name !== "AuthSessionMissingError") {
      return { success: false, error: userError.message };
    }

    if (!user?.id || !user.email) {
      return { success: false, error: "You must be signed in before completing onboarding." };
    }

    const now = new Date().toISOString();
    const careerProfile = data.career_profile;
    const highSchoolProfile = data.high_school_profile;
    const databaseUserType = toDatabaseUserType(data.user_type);
    const resumeFile = careerProfile?.resume_file ?? highSchoolProfile?.resume_file ?? null;

    const {
      data: savedAppUser,
      error: appUserError,
    } = await supabase
      .from("app_users")
      .upsert(
        {
          id: user.id,
          email: user.email,
          name: data.name,
          user_type: databaseUserType,
          onboarding_completed: true,
          updated_at: now,
        },
        { onConflict: "id" },
      )
      .select("id,email,name,user_type,onboarding_completed,updated_at")
      .single();

    if (appUserError) {
      return { success: false, error: formatSupabaseError("Saving app user failed", appUserError.message) };
    }

    if (!savedAppUser?.id || savedAppUser.onboarding_completed !== true) {
      return { success: false, error: "Saving app user failed: app_users was not updated." };
    }

    const {
      data: savedCareerProfile,
      error: careerProfileError,
    } = await supabase
      .from("career_profiles")
      .upsert(
        {
          user_id: user.id,
          target_field: careerProfile?.target_field ?? highSchoolProfile?.interested_major_or_field ?? null,
          interview_type: highSchoolProfile?.interview_type ?? null,
          skills: careerProfile?.skills ?? [],
          major: careerProfile?.major ?? null,
          target_level: careerProfile?.target_level ?? null,
          target_job_title: null,
          grade_level: highSchoolProfile?.grade ?? null,
          intended_major: highSchoolProfile?.interested_major_or_field ?? null,
          colleges_preparing_for: highSchoolProfile?.target_colleges ?? [],
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("id,user_id,updated_at")
      .single();

    if (careerProfileError) {
      return { success: false, error: formatSupabaseError("Saving career profile failed", careerProfileError.message) };
    }

    if (!savedCareerProfile?.user_id) {
      return { success: false, error: "Saving career profile failed: career_profiles was not updated." };
    }

    if (careerProfile?.has_job_posting) {
      const jobPostingPayload = {
        user_id: user.id,
        company: careerProfile.company,
        job_title: null,
        job_description: careerProfile.job_description,
        updated_at: now,
      };

      const { data: existingJobPosting, error: existingJobPostingError } = await supabase
        .from("job_postings")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingJobPostingError) {
        return { success: false, error: formatSupabaseError("Checking job posting failed", existingJobPostingError.message) };
      }

      const { data: savedJobPosting, error: jobPostingError } = existingJobPosting?.id
        ? await supabase
          .from("job_postings")
          .update(jobPostingPayload)
          .eq("id", existingJobPosting.id)
          .select("id")
          .single()
        : await supabase
          .from("job_postings")
          .insert({ ...jobPostingPayload, created_at: now })
          .select("id")
          .single();

      if (jobPostingError) {
        return { success: false, error: formatSupabaseError("Saving job posting failed", jobPostingError.message) };
      }

      if (!savedJobPosting?.id) {
        return { success: false, error: "Saving job posting failed: job_postings was not updated." };
      }
    }

    if (resumeFile) {
      const safeFileName = getSafeFileName(resumeFile.name) || "resume";
      const storagePath = `${user.id}/${Date.now()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, resumeFile, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        return { success: false, error: formatSupabaseError("Uploading resume failed", uploadError.message) };
      }

      const {
        data: savedResume,
        error: resumeMetadataError,
      } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: resumeFile.name,
          storage_path: storagePath,
          mime_type: resumeFile.type,
          file_size: resumeFile.size,
          extracted_text: null,
        })
        .select("id,user_id,storage_path")
        .single();

      if (resumeMetadataError) {
        return { success: false, error: formatSupabaseError("Saving resume metadata failed", resumeMetadataError.message) };
      }

      if (!savedResume?.id) {
        return { success: false, error: "Saving resume metadata failed: resumes was not updated." };
      }
    }

    const {
      data: savedOnboardingStatus,
      error: onboardingStatusError,
    } = await supabase
      .from("onboarding_status")
      .upsert(
        {
          user_id: user.id,
          current_step: "completed",
          completed_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("id,user_id,current_step,completed_at")
      .single();

    if (onboardingStatusError) {
      return { success: false, error: formatSupabaseError("Saving onboarding status failed", onboardingStatusError.message) };
    }

    if (!savedOnboardingStatus?.id || savedOnboardingStatus.current_step !== "completed") {
      return { success: false, error: "Saving onboarding status failed: onboarding_status was not updated." };
    }

    const {
      data: completedAppUser,
      error: completionError,
    } = await supabase
      .from("app_users")
      .update({ onboarding_completed: true, updated_at: now })
      .eq("id", user.id)
      .select("id,onboarding_completed,updated_at")
      .single();

    if (completionError) {
      return { success: false, error: formatSupabaseError("Marking onboarding complete failed", completionError.message) };
    }

    if (!completedAppUser?.id || completedAppUser.onboarding_completed !== true) {
      return { success: false, error: "Marking onboarding complete failed: app_users was not updated." };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to submit onboarding.",
    };
  }
}
