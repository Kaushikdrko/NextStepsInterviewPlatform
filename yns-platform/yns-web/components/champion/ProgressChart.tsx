'use client';

import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { formatDate } from '@/lib/champion/helpers';
import type { ScoreTrendPoint } from '@/lib/champion/types';

const chartWidth = 560;
const chartHeight = 190;
const chartPadding = 30;

// Interview scores over time — an SVG line chart styled to match the student
// dashboard's PracticeProgressGraph.
export function ProgressChart({ data }: { data: ScoreTrendPoint[] }) {
  const { areaPath, linePath, points, trend } = useMemo(() => {
    if (data.length === 0) {
      return { areaPath: '', linePath: '', points: [] as { x: number; y: number }[], trend: 0 };
    }

    const usableWidth = chartWidth - chartPadding * 2;
    const usableHeight = chartHeight - chartPadding * 2;
    const maxScore = 100;

    const nextPoints = data.map((item, index) => {
      const x = data.length === 1 ? chartWidth / 2 : chartPadding + (index / (data.length - 1)) * usableWidth;
      const y = chartHeight - chartPadding - (item.score / maxScore) * usableHeight;
      return { x, y };
    });

    const nextLinePath = nextPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const nextAreaPath =
      nextPoints.length > 1
        ? `${nextLinePath} L ${nextPoints[nextPoints.length - 1].x} ${chartHeight - chartPadding} L ${nextPoints[0].x} ${chartHeight - chartPadding} Z`
        : '';

    return {
      areaPath: nextAreaPath,
      linePath: nextLinePath,
      points: nextPoints,
      trend: data.length > 1 ? data[data.length - 1].score - data[0].score : 0,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm font-semibold text-slate-500">
        No interview scores yet. The trend will appear once this student completes a practice interview.
      </div>
    );
  }

  const trendUp = trend >= 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">Interview score trend</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold ${
            trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {trendUp ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : <TrendingDown className="h-4 w-4" aria-hidden="true" />}
          {trendUp ? '+' : ''}
          {trend} pts
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 p-4">
        <svg className="h-[220px] w-full" viewBox={`0 0 ${chartWidth} ${chartHeight + 28}`} role="img" aria-label="Interview score trend chart">
          <defs>
            <linearGradient id="champion-progress-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((line) => {
            const y = chartPadding + line * ((chartHeight - chartPadding * 2) / 3);
            return <line key={line} x1={chartPadding} x2={chartWidth - chartPadding} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
          })}

          {areaPath ? <path d={areaPath} fill="url(#champion-progress-area)" /> : null}
          {linePath ? <path d={linePath} fill="none" stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /> : null}

          {points.map((point, index) => (
            <g key={data[index].date}>
              <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
              <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-slate-600 text-[12px] font-bold">
                {data[index].score}
              </text>
              <text x={point.x} y={chartHeight + 16} textAnchor="middle" className="fill-slate-400 text-[11px] font-bold">
                {formatDate(data[index].date)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
