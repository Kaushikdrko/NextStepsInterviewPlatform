import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { NextStep } from '@/components/profile/NextStep';
import { ProfileSummaryCard } from '@/components/profile/ProfileSummaryCard';
import { ResumeCard } from '@/components/profile/ResumeCard';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
      <Sidebar />

      <div className="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-6 lg:min-h-screen lg:pl-[220px]">
        <div className="app-page-container space-y-5 lg:px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#8a7c75]">
            <Link href="/dashboard" className="text-[#ad2d1f] transition hover:text-[#992719]">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-[#a3958b]" aria-hidden="true" />
            <span className="text-[#271f1b]">Profile</span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#271f1b]">Profile</h1>
            <p className="mt-1 text-sm font-semibold text-[#8a7c75]">
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
