'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';

import {
  getWeeklyPracticeProgress,
  INTERVIEW_FEEDBACK_UPDATED_EVENT,
  type WeeklyPracticeProgressItem,
} from '@/lib/services/interview-feedback';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const emptyWeeklyProgress: WeeklyPracticeProgressItem[] = [
  { day: 'Mon', questions: 0 },
  { day: 'Tue', questions: 0 },
  { day: 'Wed', questions: 0 },
  { day: 'Thu', questions: 0 },
  { day: 'Fri', questions: 0 },
  { day: 'Sat', questions: 0 },
  { day: 'Sun', questions: 0 },
];

const chartWidth = 560;
const chartHeight = 190;
const chartPadding = 28;

function getPoint(index: number, questions: number, totalDays: number, maxQuestions: number) {
  const usableWidth = chartWidth - chartPadding * 2;
  const usableHeight = chartHeight - chartPadding * 2;
  const x = chartPadding + (index / (totalDays - 1)) * usableWidth;
  const y = chartHeight - chartPadding - (questions / maxQuestions) * usableHeight;

  return { x, y };
}

export function PracticeProgressGraph() {
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyPracticeProgressItem[]>(emptyWeeklyProgress);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    async function refreshProgress() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      setWeeklyProgress(user?.id ? getWeeklyPracticeProgress(user.id) : emptyWeeklyProgress);
    }

    void refreshProgress();

    const handleRefresh = () => void refreshProgress();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshProgress();
    });

    window.addEventListener(INTERVIEW_FEEDBACK_UPDATED_EVENT, handleRefresh);
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener(INTERVIEW_FEEDBACK_UPDATED_EVENT, handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, []);

  const totalQuestions = weeklyProgress.reduce((total, item) => total + item.questions, 0);
  const maxQuestions = Math.max(5, ...weeklyProgress.map((item) => item.questions));

  const { areaPath, linePath, points } = useMemo(() => {
    const nextPoints = weeklyProgress.map((item, index) => getPoint(index, item.questions, weeklyProgress.length, maxQuestions));
    const nextLinePath = nextPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const nextAreaPath = `${nextLinePath} L ${nextPoints[nextPoints.length - 1].x} ${chartHeight - chartPadding} L ${nextPoints[0].x} ${chartHeight - chartPadding} Z`;

    return {
      areaPath: nextAreaPath,
      linePath: nextLinePath,
      points: nextPoints,
    };
  }, [maxQuestions, weeklyProgress]);

  return (
    <section className="rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">Practice Progress</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Questions answered this week</p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-600">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          {totalQuestions} this week
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 p-4">
        <svg className="h-[230px] w-full" viewBox={`0 0 ${chartWidth} ${chartHeight + 28}`} role="img" aria-label="Practice progress chart">
          <defs>
            <linearGradient id="practice-progress-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((line) => {
            const y = chartPadding + line * ((chartHeight - chartPadding * 2) / 3);

            return <line key={line} x1={chartPadding} x2={chartWidth - chartPadding} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
          })}

          <path d={areaPath} fill="url(#practice-progress-area)" />
          <path d={linePath} fill="none" stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

          {points.map((point, index) => (
            <g key={weeklyProgress[index].day}>
              <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
              <text x={point.x} y={chartHeight + 16} textAnchor="middle" className="fill-slate-500 text-[12px] font-bold">
                {weeklyProgress[index].day}
              </text>
            </g>
          ))}
        </svg>

        <div className="flex items-center justify-center border-t border-slate-200 pt-4 text-center text-sm font-semibold text-slate-500">
          {totalQuestions > 0
            ? 'Your weekly progress reflects completed interview sessions from this browser.'
            : 'Your progress will update here once you start completing practice questions.'}
        </div>
      </div>
    </section>
  );
}
