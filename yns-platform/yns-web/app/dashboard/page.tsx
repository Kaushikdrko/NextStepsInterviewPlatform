'use client';

import { useEffect, useState } from 'react';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FocusAreaCard } from '@/components/dashboard/FocusAreaCard';
import { PracticeProgressGraph } from '@/components/dashboard/PracticeProgressGraph';
import { PracticeStreakCard } from '@/components/dashboard/PracticeStreakCard';
import { RecentSessions } from '@/components/dashboard/RecentSessions';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatsSection } from '@/components/dashboard/StatsSection';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { WeeklyGoalCard } from '@/components/dashboard/WeeklyGoalCard';
import { waitForFirebaseUser } from '@/lib/firebase/client';
import {
  getDashboardStats,
  getSessionHistory,
  type DashboardStatsResponse,
  type SessionSummary,
} from '@/lib/services/interview-assistant';
import { getProfileSummary } from '@/lib/services/profile-summary';
import { getUser } from '@/lib/services/users';

const emptyStats: DashboardStatsResponse = {
  interviews_completed: 0,
  questions_answered: 0,
  average_feedback_score: null,
  practice_streak_days: 0,
};

export default function DashboardPage() {
  const [userName, setUserName] = useState('there');
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStatsResponse>(emptyStats);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function refreshDashboard() {
      const firebaseUser = await waitForFirebaseUser();
      if (!firebaseUser?.uid) return;

      const [userResult, profileResult, statsResult, historyResult] = await Promise.allSettled([
        getUser(firebaseUser.uid),
        getProfileSummary(firebaseUser.uid),
        getDashboardStats(),
        getSessionHistory(),
      ]);

      if (!isMounted) return;

      if (userResult.status === 'fulfilled' && userResult.value.name?.trim()) {
        setUserName(userResult.value.name.trim());
      }

      if (profileResult.status === 'fulfilled') {
        const profile = profileResult.value;
        setTargetRole(
          profile.job_posting?.job_title?.trim() ||
            profile.career_profile?.target_field?.trim() ||
            profile.high_school_profile?.intended_major?.trim() ||
            null,
        );
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      }

      if (historyResult.status === 'fulfilled') {
        setRecentSessions(historyResult.value.sessions.slice(0, 4));
      }
    }

    void refreshDashboard();

    const handleRefresh = () => void refreshDashboard();
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
      <Sidebar />

      <div className="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-6 lg:min-h-screen lg:pl-[220px]">
        <div className="app-page-container lg:px-6">
          <DashboardHeader targetRole={targetRole} />

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_clamp(300px,24vw,360px)]">
            <div className="flex min-w-0 flex-col gap-4">
              <WelcomeSection userName={userName} practiceStreakDays={stats.practice_streak_days} />
              <StatsSection stats={stats} />
              <PracticeProgressGraph />
              <RecentSessions sessions={recentSessions} />
            </div>

            <aside className="grid min-w-0 gap-3 border-t border-[#e7dbd0] pt-5 md:grid-cols-2 xl:flex xl:flex-col xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
              <p className="text-xs font-extrabold uppercase tracking-normal text-[#8a7c75] md:col-span-2">Your status</p>
              <WeeklyGoalCard />
              <PracticeStreakCard days={stats.practice_streak_days} />
              <div className="md:col-span-2 xl:flex xl:flex-1">
                <FocusAreaCard />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
