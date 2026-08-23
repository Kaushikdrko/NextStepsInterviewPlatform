import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { NextStep } from '@/components/profile/NextStep';
import { ProfileSummaryCard } from '@/components/profile/ProfileSummaryCard';
import { ResumeCard } from '@/components/profile/ResumeCard';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-6 lg:min-h-screen lg:pl-[220px]">
        <div className="app-page-container space-y-5 lg:px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Link href="/dashboard" className="transition hover:text-slate-950">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="text-slate-950">Profile</span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Profile</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Your details and resume, used to personalize interview questions.
            </p>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_clamp(320px,26vw,400px)]">
            <section className="space-y-5">
              <ProfileSummaryCard />
              <ResumeCard />
            </section>
            <aside className="space-y-5">
              <NextStep />
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
