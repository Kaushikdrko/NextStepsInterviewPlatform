import { TrendingUp } from 'lucide-react';

const weeklyProgress = [
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
const maxQuestions = Math.max(5, ...weeklyProgress.map((item) => item.questions));

function getPoint(index: number, questions: number) {
  const usableWidth = chartWidth - chartPadding * 2;
  const usableHeight = chartHeight - chartPadding * 2;
  const x = chartPadding + (index / (weeklyProgress.length - 1)) * usableWidth;
  const y = chartHeight - chartPadding - (questions / maxQuestions) * usableHeight;

  return { x, y };
}

const points = weeklyProgress.map((item, index) => getPoint(index, item.questions));
const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - chartPadding} L ${points[0].x} ${chartHeight - chartPadding} Z`;

export function PracticeProgressGraph() {
  const totalQuestions = weeklyProgress.reduce((total, item) => total + item.questions, 0);

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

        <div className="flex items-center justify-center border-t border-slate-200 pt-4 text-sm font-semibold text-slate-500">
          Your progress will update here once you start completing practice questions.
        </div>
      </div>
    </section>
  );
}
