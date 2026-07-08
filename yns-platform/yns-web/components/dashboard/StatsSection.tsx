'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Flame, MessageSquare, Star } from 'lucide-react';

import {
  getInterviewDashboardStats,
  INTERVIEW_FEEDBACK_UPDATED_EVENT,
  type InterviewDashboardStats,
} from '@/lib/services/interview-feedback';

const emptyStats: InterviewDashboardStats = {
  interviewsCompleted: 0,
  questionsAnswered: 0,
  practiceStreakDays: 0,
};

function formatStreak(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export function StatsSection() {
  const [dashboardStats, setDashboardStats] = useState<InterviewDashboardStats>(emptyStats);

  useEffect(() => {
    function refreshStats() {
      setDashboardStats(getInterviewDashboardStats());
    }

    refreshStats();

    window.addEventListener(INTERVIEW_FEEDBACK_UPDATED_EVENT, refreshStats);
    window.addEventListener('storage', refreshStats);
    window.addEventListener('focus', refreshStats);
    document.addEventListener('visibilitychange', refreshStats);

    return () => {
      window.removeEventListener(INTERVIEW_FEEDBACK_UPDATED_EVENT, refreshStats);
      window.removeEventListener('storage', refreshStats);
      window.removeEventListener('focus', refreshStats);
      document.removeEventListener('visibilitychange', refreshStats);
    };
  }, []);

  const stats = [
    {
      label: 'Interviews Completed',
      value: String(dashboardStats.interviewsCompleted),
      icon: CheckCircle2,
      iconClassName: 'bg-blue-50 text-blue-500',
    },
    {
      label: 'Questions Answered',
      value: String(dashboardStats.questionsAnswered),
      icon: MessageSquare,
      iconClassName: 'bg-purple-50 text-purple-500',
    },
    {
      label: 'Avg. Feedback Score',
      value: typeof dashboardStats.averageFeedbackScore === 'number' ? `${dashboardStats.averageFeedbackScore}%` : '-',
      icon: Star,
      iconClassName: 'bg-amber-50 text-amber-500',
    },
    {
      label: 'Practice Streak',
      value: formatStreak(dashboardStats.practiceStreakDays),
      icon: Flame,
      iconClassName: 'bg-rose-50 text-rose-500',
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.iconClassName}`}>
            <stat.icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="mt-4">
            <p className="text-2xl font-bold leading-none text-slate-950">{stat.value}</p>
            <p className="mt-2 text-xs font-bold text-slate-500 sm:text-sm">{stat.label}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
