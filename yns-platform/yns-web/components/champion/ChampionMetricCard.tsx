import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ChampionMetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName?: string;
  hint?: string;
}

export function ChampionMetricCard({ label, value, icon: Icon, iconClassName, hint }: ChampionMetricCardProps) {
  return (
    <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500', iconClassName)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="mt-4">
        <p className="text-2xl font-bold leading-none text-slate-950">{value}</p>
        <p className="mt-2 text-xs font-bold text-slate-500 sm:text-sm">{label}</p>
        {hint ? <p className="mt-1 text-xs font-semibold text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}
