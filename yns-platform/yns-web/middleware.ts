import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ["/onboarding", "/dashboard", "/sessions", "/champion"];

const CHAMPION_PREFIX = "/champion";

// yns-web has no server-side means to cryptographically verify a Firebase
// session in middleware (that needs firebase-admin, which doesn't run on
// the Edge runtime middleware uses). yns-firebase/client.ts keeps these
// cookies in sync with real client-side auth state as a redirect hint only
// — this is NOT a security boundary. The API enforces the same rule
// independently — see get_current_student/require_champion_user in
// yns-api/app/dependencies.py.
const SESSION_COOKIE = "yns-session";

// Written only from the API's answer about the signed-in user (champion emails
// are allowlisted server-side, so nothing in the browser can work it out). It
// is often absent — an admin arriving straight at /champion/dashboard has not
// asked the question yet — so it can rule champion access out, never in.
// ChampionAccessGuard makes the real call when this says nothing.
const ROLE_COOKIE = "yns-role";
const NOT_A_CHAMPION = "student";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/sign-up", request.url));
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const isSignedIn = request.cookies.get(SESSION_COOKIE)?.value === "1";

    if (!isSignedIn) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (pathname.startsWith(CHAMPION_PREFIX) && request.cookies.get(ROLE_COOKIE)?.value === NOT_A_CHAMPION) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png).*)"],
};
