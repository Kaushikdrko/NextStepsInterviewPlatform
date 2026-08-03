'use client';

import { STATUS_OPTIONS, type ActivityStatus } from '@/lib/champion/types';
import { cn } from '@/lib/utils';

export function StudentActivityFilters({
  value,
  onChange,
}: {
  value: ActivityStatus;
  onChange: (status: ActivityStatus) => void;
}) {
  return (
    <div role="group" aria-label="Filter by activity" className="flex flex-wrap items-center gap-2">
      {STATUS_OPTIONS.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            className={cn(
              'h-11 rounded-xl px-4 text-[13px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-1',
              isSelected
                ? 'bg-maroon-700 text-white'
                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
