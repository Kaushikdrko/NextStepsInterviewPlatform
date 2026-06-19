import { NextResponse, type NextRequest } from 'next/server';

function getAuthCookieName() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "sb-auth-token";
  }

  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/sign-up", request.url));
  }

  if (pathname.startsWith("/onboarding") && !request.cookies.has(getAuthCookieName())) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png).*)"],
};
