import { Suspense } from 'react';
import type { Metadata } from 'next';

import { ChampionDashboard } from '@/components/champion/ChampionDashboard';
import { StudentTableSkeleton } from '@/components/champion/StudentTableStates';

export const metadata: Metadata = {
  title: 'Champion Dashboard',
  description: 'Organization-wide student engagement',
};

function DashboardFallback() {
  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="h-9 w-72 animate-pulse rounded bg-neutral-100" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded bg-neutral-100" />
      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white">
        <StudentTableSkeleton />
      </div>
    </div>
  );
}

export default function ChampionDashboardPage() {
  // The dashboard reads its state from the query string, so it renders on the
  // client behind a Suspense boundary.
  return (
    <Suspense fallback={<DashboardFallback />}>
      <ChampionDashboard />
    </Suspense>
  );
}
