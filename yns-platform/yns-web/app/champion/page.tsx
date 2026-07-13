'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ClipboardList,
  GraduationCap,
  LifeBuoy,
  ListChecks,
  Users,
} from 'lucide-react';

import { ChampionMetricCard } from '@/components/champion/ChampionMetricCard';
import { ErrorState, LoadingState, SectionCard } from '@/components/champion/ChampionUI';
import { NeedsAttentionList } from '@/components/champion/NeedsAttentionList';
import { RecentActivityList } from '@/components/champion/RecentActivityList';
import { getAttentionAlerts, getDashboardSummary, getRecentActivity } from '@/lib/champion/service';
import { formatScore } from '@/lib/champion/helpers';
import type { ActivityItem, AttentionAlert, DashboardSummary } from '@/lib/champion/types';
import { mockChampionSettings } from '@/lib/champion/mock-data';

export default function ChampionOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<AttentionAlert[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const [summaryData, alertData, activityData] = await Promise.all([
          getDashboardSummary(),
          getAttentionAlerts(),
          getRecentActivity(),
        ]);
        if (!isMounted) return;
        setSummary(summaryData);
        setAlerts(alertData);
        setActivity(activityData);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load the dashboard.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {/* Welcome banner */}
      <section className="relative flex min-h-[160px] items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-6 text-white shadow-sm shadow-indigo-200 sm:px-7">
        <div className="absolute -right-9 -top-16 h-36 w-36 rounded-full bg-white/15" />
        <div className="absolute -bottom-24 right-11 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {mockChampionSettings.firstName} </h1>
          <p className="text-sm font-semibold text-indigo-100">
            Track student progress, review AI interview feedback, and help students prepare for their next opportunity.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/champion/students"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              View Students
            </Link>
            <Link
              href="/champion/interviews"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-2 border-white/25 px-6 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              Review Interviews
            </Link>
          </div>
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {isLoading ? <LoadingState label="Loading your dashboard…" /> : null}

      {!isLoading && summary ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ChampionMetricCard
              label="Assigned Students"
              value={summary.assignedStudentsCount}
              icon={Users}
              iconClassName="bg-indigo-50 text-indigo-500"
            />
            <ChampionMetricCard
              label="Interviews Completed"
              value={summary.interviewsCompletedCount}
              icon={GraduationCap}
              iconClassName="bg-blue-50 text-blue-500"
            />
            <ChampionMetricCard
              label="Students Needing Help"
              value={summary.studentsNeedingHelpCount}
              icon={LifeBuoy}
              iconClassName="bg-rose-50 text-rose-500"
            />
            <ChampionMetricCard
              label="Overall Readiness"
              value={formatScore(summary.overallReadinessScore)}
              icon={ListChecks}
              iconClassName="bg-amber-50 text-amber-500"
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <ChampionMetricCard
              label="Pending Reviews"
              value={summary.pendingReviewsCount}
              icon={ListChecks}
              iconClassName="bg-yellow-50 text-yellow-600"
            />
            <ChampionMetricCard
              label="Upcoming Meetings"
              value={summary.upcomingMeetingsCount}
              icon={CalendarClock}
              iconClassName="bg-emerald-50 text-emerald-500"
            />
            <ChampionMetricCard
              label="Assignments Due"
              value={summary.assignmentsDueCount}
              icon={ClipboardList}
              iconClassName="bg-purple-50 text-purple-500"
            />
          </section>

          <SectionCard
            title="Needs Attention"
            description="Students who could use your support right now."
            action={
              <Link href="/champion/students" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                View all students
              </Link>
            }
          >
            <NeedsAttentionList alerts={alerts} />
          </SectionCard>

          <SectionCard
            title="Recent Activity"
            description="Latest AI interviews from your students."
            action={
              <Link href="/champion/interviews" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                All interviews
              </Link>
            }
          >
            <RecentActivityList items={activity} />
          </SectionCard>
        </>
      ) : null}
    </>
  );
}
