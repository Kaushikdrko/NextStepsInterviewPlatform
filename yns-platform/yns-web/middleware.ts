import { NextResponse } from "next/server";

/**
 * Placeholder pass-through middleware.
 *
 * Authentication (e.g. Clerk) and role-based routing for Champions vs Students
 * will be wired in here later. For now it does nothing so the app runs.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  // Empty matcher = middleware effectively runs on no routes for now.
  matcher: [],
};
