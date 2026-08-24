import { sendPasswordResetEmail, type User } from "firebase/auth";

import { getFirebaseAuth, setChampionRoleCookie } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/utils/api-client";

export const MAIN_APP_ROUTE = "/dashboard";
export const CHAMPION_APP_ROUTE = "/champion/dashboard";
export const ONBOARDING_ROUTE = "/onboarding";

/**
 * Which experience the user asked for on the login page. It is a choice, not a
 * property of the account: an authorized champion can pick either mode, so
 * nothing here is stored against the user.
 */
export type LoginMode = "student" | "champion";

export const CHAMPION_ACCESS_DENIED_MESSAGE = "This account does not have Champion access.";
export const CHAMPION_ACCESS_UNVERIFIED_MESSAGE =
  "We could not check your Champion access just now. Check your connection and try again.";

type RedirectResult = {
  redirectTo: string | null;
  error?: string;
  /** Where a denied Champion login can continue instead, still signed in. */
  studentRoute?: string;
};

type UserResponse = {
  id: string;
  onboarding_completed: boolean;
};

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Enter your email address first.");
  }

  await sendPasswordResetEmail(getFirebaseAuth(), normalizedEmail);
}

/**
 * Asks the API whether the signed-in user is an authorized champion.
 *
 * The allowlist lives on the server and is never sent to the browser, so this
 * is the only way the frontend can know. It is also only ever a routing hint:
 * every /api/champion/* route re-checks it (require_champion_user).
 */
export async function verifyChampionAccess(): Promise<boolean> {
  const { authorized } = await apiFetch<{ authorized: boolean }>("/api/auth/champion-access");

  setChampionRoleCookie(authorized);

  return authorized;
}

async function studentRoute(userId: string): Promise<string> {
  try {
    const user = await apiFetch<UserResponse>(`/api/users/${userId}`);

    return user.onboarding_completed ? MAIN_APP_ROUTE : ONBOARDING_ROUTE;
  } catch {
    // No app_users row yet (new sign-up) or the request failed — send them
    // through onboarding, same as the old "no row found" branch.
    return ONBOARDING_ROUTE;
  }
}

export async function getPostLoginRedirect(
  userId: string,
  mode: LoginMode = "student",
): Promise<RedirectResult> {
  if (mode === "student") {
    return { redirectTo: await studentRoute(userId) };
  }

  let authorized: boolean;

  try {
    authorized = await verifyChampionAccess();
  } catch {
    // A failed check is not a denial — say so instead of quietly routing them
    // into the student dashboard.
    return { redirectTo: null, error: CHAMPION_ACCESS_UNVERIFIED_MESSAGE };
  }

  if (!authorized) {
    // Champions skip the onboarding gate, but someone who picked this mode by
    // mistake is already signed in, so offer their student destination rather
    // than signing them out.
    return {
      redirectTo: null,
      error: CHAMPION_ACCESS_DENIED_MESSAGE,
      studentRoute: await studentRoute(userId),
    };
  }

  return { redirectTo: CHAMPION_APP_ROUTE };
}

export async function hasCompletedOnboarding(user: User): Promise<boolean> {
  return (await studentRoute(user.uid)) !== ONBOARDING_ROUTE;
}
