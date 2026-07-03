import { Badge } from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';

interface StepHeaderProps {
  title: string;
  description: string;
  stepLabel?: string;
  icon?: LucideIcon;
}

export function StepHeader({ title, description, stepLabel, icon: Icon }: StepHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {Icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:h-14 sm:w-14">
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
          </div>
        ) : null}
        {stepLabel ? (
          <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 shadow-none">
            {stepLabel}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2">
        <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
        <p className="max-w-3xl text-base leading-6 text-slate-500 sm:text-lg">{description}</p>
      </div>
    </div>
  );
}
