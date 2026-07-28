import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ["/onboarding", "/dashboard", "/sessions", "/champion"];

const CHAMPION_PREFIX = "/champion";
const CHAMPION_ROLES = new Set(["champion", "admin"]);

// This is a redirect for the benefit of the person browsing, not a security
// boundary. The API enforces the same rule independently — see
// require_champion_user in yns-api/app/dependencies.py.
function hasChampionRole(user: User): boolean {
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/sign-up", request.url));
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const { response, user } = await updateSession(request);

    if (!user) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (pathname.startsWith(CHAMPION_PREFIX) && !hasChampionRole(user)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png).*)"],
};
