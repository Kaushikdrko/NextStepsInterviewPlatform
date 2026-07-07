import { NextStep } from '@/components/dashboard/NextStep';
import { PracticeProgressGraph } from '@/components/dashboard/PracticeProgressGraph';
import { ProfileSummaryCard } from '@/components/dashboard/ProfileSummaryCard';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatsSection } from '@/components/dashboard/StatsSection';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="min-h-screen px-4 py-6 sm:px-6 lg:pl-[220px]">
        <div className="mx-auto w-full max-w-6xl space-y-5 lg:px-6">
          <WelcomeSection />
          <StatsSection />

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-5">
              <PracticeProgressGraph />
              <ProfileSummaryCard />
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
