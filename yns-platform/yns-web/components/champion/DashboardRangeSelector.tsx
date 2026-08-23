'use client';

import { RANGE_OPTIONS, type DashboardRange } from '@/lib/champion/types';
import { cn } from '@/lib/utils';

export function DashboardRangeSelector({
  value,
  onChange,
}: {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Time range"
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {RANGE_OPTIONS.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            className={cn(
              'shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-1',
              isSelected
                ? 'bg-maroon-700 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
