import { BarChart3, CalendarDays, CircleHelp } from 'lucide-react';

import type { DashboardStatsResponse } from '@/lib/services/interview-assistant';

type StatsSectionProps = {
  stats: DashboardStatsResponse;
};

export function StatsSection({ stats }: StatsSectionProps) {
  const items = [
    {
      label: 'Interviews completed',
      value: String(stats.interviews_completed),
      icon: CalendarDays,
    },
    {
      label: 'Questions answered',
      value: String(stats.questions_answered),
      icon: CircleHelp,
    },
    {
      label: 'Avg. feedback score',
      value: typeof stats.average_feedback_score === 'number' ? `${stats.average_feedback_score}%` : '-',
      icon: BarChart3,
    },
  ];

  return (
    <section className="grid rounded-[14px] border border-[#e7dbd0] bg-white px-3 py-3 shadow-[0_2px_5px_rgba(78,45,31,0.05)] sm:grid-cols-3 sm:px-5">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex min-w-0 items-center gap-3 px-2 py-2 ${index > 0 ? 'border-t border-[#eadfd7] sm:border-l sm:border-t-0 sm:pl-5' : ''}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff2ed] text-[#ad2d1f]">
            <item.icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-black leading-none text-[#271f1b]">{item.value}</p>
            <p className="mt-1 truncate text-xs font-medium text-[#8a7c75]">{item.label}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
