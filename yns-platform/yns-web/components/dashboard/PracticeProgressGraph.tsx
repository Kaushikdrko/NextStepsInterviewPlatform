'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';

import { getWeeklyProgress, type WeeklyProgressItem } from '@/lib/services/interview-assistant';

const emptyWeeklyProgress: WeeklyProgressItem[] = [
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
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressItem[]>(emptyWeeklyProgress);

  useEffect(() => {
    let isMounted = true;

    async function refreshProgress() {
      try {
        const progress = await getWeeklyProgress();
        if (isMounted) {
          setWeeklyProgress(progress.items);
        }
      } catch {
        if (isMounted) {
          setWeeklyProgress(emptyWeeklyProgress);
        }
      }
    }

    void refreshProgress();

    const handleRefresh = () => void refreshProgress();

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      isMounted = false;
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
    <section className="rounded-[14px] border border-[#e7dbd0] bg-white p-5 shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ChartNoAxesCombined className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
          <h2 className="text-sm font-extrabold text-[#271f1b]">Weekly progress</h2>
        </div>

        <span className="rounded-full bg-[#fff2ed] px-3 py-1 text-xs font-extrabold text-[#ad2d1f]">
          {totalQuestions} questions answered
        </span>
      </div>

      <div className="mt-3 overflow-hidden">
        <svg className="h-[255px] w-full" viewBox={`0 0 ${chartWidth} ${chartHeight + 28}`} role="img" aria-label="Questions answered each day this week">
          <defs>
            <linearGradient id="practice-progress-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ad2d1f" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ad2d1f" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((line) => {
            const y = chartPadding + line * ((chartHeight - chartPadding * 2) / 3);

            return <line key={line} x1={chartPadding} x2={chartWidth - chartPadding} y1={y} y2={y} stroke="#eee5de" strokeWidth="1" />;
          })}

          <path d={areaPath} fill="url(#practice-progress-area)" />
          <path d={linePath} fill="none" stroke="#ad2d1f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

          {points.map((point, index) => (
            <g key={weeklyProgress[index].day}>
              <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#ad2d1f" strokeWidth="3" />
              <text x={point.x} y={Math.max(15, point.y - 11)} textAnchor="middle" className="fill-[#8a7c75] text-[11px] font-bold">
                {weeklyProgress[index].questions}
              </text>
              <text x={point.x} y={chartHeight + 16} textAnchor="middle" className="fill-[#8a7c75] text-[12px] font-bold">
                {weeklyProgress[index].day}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
