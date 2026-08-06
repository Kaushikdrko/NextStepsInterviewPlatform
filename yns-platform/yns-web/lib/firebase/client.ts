import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onIdTokenChanged,
  type Auth,
  type IdTokenResult,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const CHAMPION_ROLES = new Set(["champion", "admin"]);

// yns-web has no server-side Firebase session verification (that would need
// firebase-admin, which doesn't run on the Edge runtime middleware.ts uses).
// These cookies are read-only hints for middleware.ts's redirect UX — never
// treated as a security boundary. The real enforcement is per-endpoint in
// yns-api (get_current_student / require_champion_user), same as documented
// for the old Supabase+RLS-free setup.
const SESSION_COOKIE = "yns-session";
const ROLE_COOKIE = "yns-role";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error("Missing Firebase environment variables.");
  }

  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  if (!auth) {
    auth = getAuth(app);

    if (typeof document !== "undefined") {
      onIdTokenChanged(auth, async (user) => {
        if (!user) {
          clearCookie(SESSION_COOKIE);
          clearCookie(ROLE_COOKIE);
          return;
        }

        setCookie(SESSION_COOKIE, "1");
        const claims = await getIdTokenClaims(user);
        setCookie(ROLE_COOKIE, hasChampionRole(claims) ? "champion" : "student");
      });
    }
  }

  return auth;
}

export async function getIdTokenClaims(user: User): Promise<IdTokenResult["claims"]> {
  const result = await user.getIdTokenResult();
  return result.claims;
}

export function hasChampionRole(claims: IdTokenResult["claims"] | null | undefined): boolean {
  if (!claims) return false;

  const role = claims.role;
  const roles = claims.roles;
  const candidates = [role, ...(Array.isArray(roles) ? roles : [])];

  return candidates.some((candidate) => typeof candidate === "string" && CHAMPION_ROLES.has(candidate));
}

// Firebase restores a persisted session asynchronously on page load; unlike
// Supabase's cookie-based getUser()/getSession(), there's a brief window
// where currentUser is null even for a signed-in user. Callers that need
// "the current user, once known" (mirroring the old `await supabase.auth.
// getUser()` call sites) should use this instead of reading currentUser
// directly.
export function waitForFirebaseUser(): Promise<User | null> {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const user = await waitForFirebaseUser();
  return user ? user.getIdToken() : null;
}
