import { NextResponse } from "next/server";

// Placeholder Clerk webhook handler so the project builds.
// Replace with real signature verification + user sync.
export async function POST() {
  return NextResponse.json({ received: true });
}
