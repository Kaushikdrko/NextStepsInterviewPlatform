'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const WINDOW = 5;

/** Page numbers around the current page, with gaps marked as null. */
function pageWindow(page: number, totalPages: number): Array<number | null> {
  if (totalPages <= WINDOW + 2) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(WINDOW / 2);
  const start = Math.max(2, Math.min(page - half, totalPages - WINDOW));
  const end = Math.min(totalPages - 1, start + WINDOW - 1);

  const pages: Array<number | null> = [1];
  if (start > 2) {
    pages.push(null);
  }
  for (let value = start; value <= end; value += 1) {
    pages.push(value);
  }
  if (end < totalPages - 1) {
    pages.push(null);
  }
  pages.push(totalPages);

  return pages;
}

const STEP_CLASSES =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

export function ChampionPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Student list pages" className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={STEP_CLASSES}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Previous page</span>
      </button>

      {pageWindow(page, totalPages).map((value, index) =>
        value === null ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-sm font-medium text-neutral-400"
          >
            …
          </span>
        ) : (
          <button
            key={value}
            type="button"
            onClick={() => onPageChange(value)}
            aria-current={value === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-lg border px-2.5 text-[13px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2',
              value === page
                ? 'border-maroon-700 bg-white text-maroon-700'
                : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900',
            )}
          >
            <span className="sr-only">Page </span>
            {value}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={STEP_CLASSES}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Next page</span>
      </button>
    </nav>
  );
}
