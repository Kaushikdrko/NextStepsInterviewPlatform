import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseAuthStorageKey() {
  if (!supabaseUrl) {
    return "sb-auth-token";
  }

  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function persistSessionForServer(_session?: Session) {
  // @supabase/ssr persists browser auth state into cookies automatically.
}
