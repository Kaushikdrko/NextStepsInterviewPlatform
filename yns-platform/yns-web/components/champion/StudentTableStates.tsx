'use client';

import { AlertTriangle, RotateCcw, Users } from 'lucide-react';

const SKELETON_COLUMNS = ['w-40', 'w-10', 'w-8', 'w-14'] as const;

export function StudentTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="px-6 py-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-6 border-t border-neutral-100 py-[22px] first:border-t-0"
        >
          {SKELETON_COLUMNS.map((width, columnIndex) => (
            <div
              key={columnIndex}
              className={`h-3.5 animate-pulse rounded bg-neutral-100 ${width} ${
                columnIndex === 0 ? 'mr-auto' : ''
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StudentTableEmptyState({
  title,
  description,
  onResetFilters,
}: {
  title: string;
  description?: string;
  onResetFilters?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-maroon-50 text-maroon-700">
        <Users className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-[15px] font-semibold text-neutral-900">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm font-medium text-neutral-500">{description}</p>
      ) : null}
      {onResetFilters ? (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-1 rounded-lg border border-neutral-200 px-3.5 py-2 text-[13px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
        >
          Clear search and filters
        </button>
      ) : null}
    </div>
  );
}

export function StudentTableErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-maroon-50 text-maroon-700">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-[15px] font-semibold text-neutral-900">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-maroon-700 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-maroon-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
