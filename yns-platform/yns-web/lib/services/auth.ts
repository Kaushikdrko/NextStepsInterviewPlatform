import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const MAIN_APP_ROUTE = "/dashboard";

type RedirectResult = {
  redirectTo: string;
  error?: string;
};

export async function getPostLoginRedirect(userId: string, supabase: SupabaseClient = createSupabaseBrowserClient()): Promise<RedirectResult> {
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

  return { redirectTo: data.onboarding_completed ? MAIN_APP_ROUTE : "/onboarding" };
}

export async function hasCompletedOnboarding(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { redirectTo } = await getPostLoginRedirect(userId, supabase);

  return redirectTo === MAIN_APP_ROUTE;
}
