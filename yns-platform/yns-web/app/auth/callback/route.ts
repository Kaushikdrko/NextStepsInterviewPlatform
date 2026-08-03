import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

import { getPostLoginRedirect } from "@/lib/services/auth";
import { getSupabaseCookieOptions } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/sign-in${error ? `?error=${encodeURIComponent(error)}` : ""}`, requestUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/sign-in?error=Missing%20Supabase%20environment%20variables", requestUrl.origin));
  }

  const responseCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        responseCookies.push(...cookiesToSet);
      },
    },
    cookieOptions: getSupabaseCookieOptions(),
  });

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(exchangeError?.message ?? "Unable to confirm your account")}`, requestUrl.origin),
    );
  }

  const { redirectTo } = data.user
    ? await getPostLoginRedirect(data.user.id, supabase, data.user)
    : { redirectTo: "/onboarding" };

  const response = NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
  responseCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
