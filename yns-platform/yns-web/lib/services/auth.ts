import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const MAIN_APP_ROUTE = "/dashboard";
export const CHAMPION_APP_ROUTE = "/champion/dashboard";

const CHAMPION_ROLES = new Set(["champion", "admin"]);

type RedirectResult = {
  redirectTo: string;
  error?: string;
};

type RoleUser = Pick<User, "app_metadata" | "user_metadata">;

function hasChampionRole(user: RoleUser | null | undefined): boolean {
  if (!user) {
    return false;
  }

  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const candidates = [
    appMetadata.role,
    userMetadata.role,
    ...(Array.isArray(appMetadata.roles) ? appMetadata.roles : []),
    ...(Array.isArray(userMetadata.roles) ? userMetadata.roles : []),
  ];

  return candidates.some((role) => typeof role === "string" && CHAMPION_ROLES.has(role));
}

async function resolveCurrentUser(supabase: SupabaseClient, user?: RoleUser): Promise<RoleUser | null> {
  if (user) {
    return user;
  }

  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getPostLoginRedirect(
  userId: string,
  supabase: SupabaseClient = createSupabaseBrowserClient(),
  user?: RoleUser,
): Promise<RedirectResult> {
  // TODO: Enable RLS and user-scoped policies before production.
  const { data, error } = await supabase
    .from("app_users")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { redirectTo: "/onboarding", error: error.message };
  }

  if (!data) {
    return { redirectTo: "/onboarding" };
  }

  if (!data.onboarding_completed) {
    return { redirectTo: "/onboarding" };
  }

  const currentUser = await resolveCurrentUser(supabase, user);
  return { redirectTo: hasChampionRole(currentUser) ? CHAMPION_APP_ROUTE : MAIN_APP_ROUTE };
}

export async function hasCompletedOnboarding(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { redirectTo } = await getPostLoginRedirect(userId, supabase);

  return redirectTo !== "/onboarding";
}
