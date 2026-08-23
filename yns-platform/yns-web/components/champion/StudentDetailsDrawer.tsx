'use client';

import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

import { describeRange, formatCount, formatPracticeTime, initialsFor, orNotProvided } from '@/lib/champion/format';
import type { ChampionStudentDetails, DashboardRange } from '@/lib/champion/types';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-neutral-100 py-3 last:border-b-0">
      <dt className="shrink-0 text-[13px] font-medium text-neutral-500">{label}</dt>
      <dd className="min-w-0 break-words text-right text-[13px] font-semibold text-neutral-900">
        {value}
      </dd>
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 px-4 py-3">
      <dt className="text-[12px] font-medium text-neutral-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums text-neutral-900">{value}</dd>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-100" />
        <div className="space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-3.5 animate-pulse rounded bg-neutral-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

export function StudentDetailsDrawer({
  isOpen,
  range,
  details,
  fallbackName,
  isLoading,
  error,
  onClose,
  onRetry,
}: {
  isOpen: boolean;
  range: DashboardRange;
  details: ChampionStudentDetails | null;
  /** The name from the table row, so the header is filled in while loading. */
  fallbackName?: string;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    closeButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const isInside = active ? panel.contains(active) : false;

      if (event.shiftKey && (!isInside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!isInside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const heading = details?.fullName ?? fallbackName ?? 'Student details';

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-overlay-in bg-neutral-900/30 motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 flex w-full animate-drawer-in flex-col border-l border-neutral-200 bg-white shadow-2xl motion-reduce:animate-none sm:w-[min(88vw,452px)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-bold text-neutral-900">
              {heading}
            </h2>
            <p className="mt-0.5 text-[13px] font-medium text-neutral-500">Student details</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close student details</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? <DrawerSkeleton /> : null}

          {error ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-maroon-50 text-maroon-700">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-neutral-900">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 inline-flex items-center gap-2 rounded-lg bg-maroon-700 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-maroon-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : null}

          {details && !isLoading && !error ? (
            <div className="space-y-7 px-6 py-6">
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-maroon-800 text-sm font-bold text-white"
                >
                  {initialsFor(details.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-neutral-900">
                    {details.fullName}
                  </p>
                  <p className="truncate text-[13px] font-medium text-neutral-500">
                    {orNotProvided(details.studentType, 'Student type not provided')}
                  </p>
                </div>
              </div>

              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Basic information
                </h3>
                <dl className="mt-2">
                  <InfoRow label="School" value={orNotProvided(details.school)} />
                  <InfoRow label="Grade or year" value={orNotProvided(details.gradeOrYear)} />
                  <InfoRow label="Student type" value={orNotProvided(details.studentType)} />
                  <InfoRow
                    label="Email"
                    value={orNotProvided(details.email, 'No email on file')}
                  />
                  <InfoRow
                    label="Phone"
                    value={orNotProvided(details.phone, 'No phone number on file')}
                  />
                </dl>
              </section>

              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Usage — {describeRange(range)}
                </h3>
                <dl className="mt-2 grid grid-cols-1 gap-3 min-[380px]:grid-cols-3">
                  <UsageStat
                    label="Questions"
                    value={formatCount(details.questionsAnswered)}
                  />
                  <UsageStat
                    label="Interviews"
                    value={formatCount(details.interviewsCompleted)}
                  />
                  <UsageStat
                    label="Practice"
                    value={formatPracticeTime(details.practiceTimeSeconds)}
                  />
                </dl>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
