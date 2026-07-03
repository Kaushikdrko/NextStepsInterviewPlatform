import { Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface OptionCardProps {
  id: string;
  title: string;
  description?: string;
  selected?: boolean;
  icon?: LucideIcon;
}

export function OptionCard({ id, title, description, selected, icon: Icon = Circle }: OptionCardProps) {
  return (
    <Label htmlFor={id} className="group block cursor-pointer">
      <Card
        className={cn(
          'min-h-[72px] rounded-xl border-2 border-slate-200 p-3 shadow-none transition-all duration-200 group-hover:border-slate-300 group-hover:bg-slate-50/70 group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:ring-offset-2 sm:min-h-[82px] sm:p-4',
          selected && 'border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-100/80',
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors sm:h-12 sm:w-12',
              selected && 'bg-white text-indigo-600',
            )}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight text-slate-800 sm:text-lg">{title}</p>
            {description ? <p className="mt-0.5 text-sm leading-5 text-slate-500 sm:text-base">{description}</p> : null}
          </div>
          <RadioGroupItem value={id} id={id} className="sr-only" />
        </div>
      </Card>
    </Label>
  );
}
