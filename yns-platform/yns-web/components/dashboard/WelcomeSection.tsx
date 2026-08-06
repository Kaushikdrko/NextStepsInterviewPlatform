'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, UserRoundCog } from 'lucide-react';

import { getUser } from '@/lib/services/users';
import { waitForFirebaseUser } from '@/lib/firebase/client';

export function WelcomeSection() {
  const [userName, setUserName] = useState('there');

  useEffect(() => {
    let isMounted = true;

    async function loadUserName() {
      try {
        const user = await waitForFirebaseUser();

        if (!user?.uid) return;

        const appUser = await getUser(user.uid);
        const name = appUser.name?.trim();

        if (isMounted && name) {
          setUserName(name);
        }
      } catch {
        // Keep the friendly fallback if the API is unavailable.
      }
    }

    loadUserName();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="relative flex min-h-[160px] items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-6 text-white shadow-sm shadow-indigo-200 sm:px-7">
      <div className="absolute -right-9 -top-16 h-36 w-36 rounded-full bg-white/15" />
      <div className="absolute -bottom-24 right-11 h-40 w-40 rounded-full bg-white/10" />

      <div className="relative z-10 max-w-2xl space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {userName} 👋</h1>
          <p className="text-sm font-semibold text-indigo-100">Ready to practice your next interview?</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/practice"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-7 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Start Interview Practice
          </Link>
          <Link
            href="/settings"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-2 border-white/25 px-7 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <UserRoundCog className="h-4 w-4" aria-hidden="true" />
            Update Profile
          </Link>
        </div>
      </div>
    </section>
  );
}
