import type { IdTokenResult, User } from "firebase/auth";

import { hasChampionRole } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/utils/api-client";

export const MAIN_APP_ROUTE = "/dashboard";
export const CHAMPION_APP_ROUTE = "/champion/dashboard";

type RedirectResult = {
  redirectTo: string;
  error?: string;
};

type UserResponse = {
  id: string;
  onboarding_completed: boolean;
};

export async function getPostLoginRedirect(
  userId: string,
  claims: IdTokenResult["claims"] | null | undefined,
): Promise<RedirectResult> {
  try {
    const user = await apiFetch<UserResponse>(`/api/users/${userId}`);

    if (!user.onboarding_completed) {
      return { redirectTo: "/onboarding" };
    }

    return { redirectTo: hasChampionRole(claims) ? CHAMPION_APP_ROUTE : MAIN_APP_ROUTE };
  } catch {
    // No app_users row yet (new sign-up) or the request failed — send them
    // through onboarding, same as the old "no row found" branch.
    return { redirectTo: "/onboarding" };
  }
}

export async function hasCompletedOnboarding(user: User): Promise<boolean> {
  const claims = await user.getIdTokenResult().then((result) => result.claims);
  const { redirectTo } = await getPostLoginRedirect(user.uid, claims);

  return redirectTo !== "/onboarding";
}
