'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw } from 'lucide-react';

import { MAIN_APP_ROUTE, verifyChampionAccess } from '@/lib/services/auth';
import { ApiError } from '@/lib/utils/api-client';

type AccessState = 'checking' | 'authorized' | 'unverified';

/**
 * Keeps the Champion Dashboard shell from rendering until the API confirms the
 * signed-in user is on the champion allowlist.
 *
 * middleware.ts cannot make this call — it only sees a cookie, which it treats
 * as a hint. This is the check that makes typing /champion/dashboard behave the
 * same as choosing Champion on the login page. It is still not the security
 * boundary: every champion endpoint authorizes the request on its own, so a
 * user who got this far without access would see no student data anyway.
 */
export function ChampionAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AccessState>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    verifyChampionAccess()
      .then((authorized) => {
        if (!active) {
          return;
        }

        if (authorized) {
          setState('authorized');
          return;
        }

        router.replace(MAIN_APP_ROUTE);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          router.replace('/sign-in');
          return;
        }

        // A network or server failure is not a denial, so don't redirect on it.
        setState('unverified');
      });

    return () => {
      active = false;
    };
  }, [router, attempt]);

  if (state === 'authorized') {
    return <>{children}</>;
  }

  if (state === 'unverified') {
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center font-sans"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-maroon-50 text-maroon-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-[15px] font-semibold text-neutral-900">
          We could not check your Champion access.
        </p>
        <button
          type="button"
          onClick={() => {
            setState('checking');
            setAttempt((previous) => previous + 1);
          }}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-maroon-700 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-maroon-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 font-sans">
      <p className="text-sm font-medium text-neutral-500">Verifying Champion access…</p>
    </div>
  );
}
