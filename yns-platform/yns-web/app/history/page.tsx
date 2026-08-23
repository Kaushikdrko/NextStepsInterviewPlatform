'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, Clock, History as HistoryIcon, ListChecks, Loader2, Search, Sparkles, Star, X } from 'lucide-react';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { Input } from '@/components/ui/input';
import { getSessionHistory, type SessionSummary } from '@/lib/services/interview-assistant';
import { cn } from '@/lib/utils';

type HistoryFilter = 'all' | 'behavioral' | 'technical' | 'resume' | 'job_posting' | 'mixed';

const historyFilters: { label: string; value: HistoryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Behavioral', value: 'behavioral' },
  { label: 'Technical', value: 'technical' },
  { label: 'Resume-Based', value: 'resume' },
  { label: 'Job Posting', value: 'job_posting' },
  { label: 'General', value: 'mixed' },
];

function formatSessionType(value: string) {
  if (value === 'mixed') return 'General';

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDuration(minutes: number | null) {
  if (typeof minutes !== 'number') return null;
  if (minutes < 1) return '<1 min';
  return `${minutes} min`;
}

function getRatingTone(rating: number | null) {
  if (typeof rating !== 'number') {
    return 'bg-[#f1ece6] text-[#7a6e68]';
  }

  if (rating <= 2.5) {
    return 'bg-[#fde4e7] text-[#e60012]';
  }

  if (rating <= 3.5) {
    return 'bg-[#fff2cc] text-[#b77900]';
  }

  return 'bg-[#e4f3ea] text-[#2f9a5f]';
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 250);

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const data = await getSessionHistory(searchQuery);
        if (isMounted) setSessions(data.sessions);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load interview history.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const filteredSessions = useMemo(() => {
    if (activeFilter === 'all') return sessions;
    return sessions.filter((session) => session.session_type === activeFilter);
  }, [activeFilter, sessions]);

  const filterCounts = useMemo(() => {
    return historyFilters.reduce(
      (counts, filter) => {
        counts[filter.value] =
          filter.value === 'all' ? sessions.length : sessions.filter((session) => session.session_type === filter.value).length;
        return counts;
      },
      {} as Record<HistoryFilter, number>
    );
  }, [sessions]);

  const selectedFilterLabel = historyFilters.find((filter) => filter.value === activeFilter)?.label ?? 'selected';

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
      <Sidebar />

      <div className="min-h-[calc(100svh-4rem)] px-4 py-7 sm:px-6 sm:py-9 lg:min-h-screen lg:pl-[220px]">
        <div className="app-page-container space-y-5 lg:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Link href="/dashboard" className="text-[#ad2d1f] transition hover:text-[#8f2419]">
                  Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 text-[#7a6e68]" aria-hidden="true" />
                <span className="text-[#271f1b]">History</span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-normal text-[#271f1b] sm:text-4xl">Interview History</h1>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-[#8a7c75] sm:text-base">
                Review all completed practice sessions, filter by interview type, and see how your scores are trending.
              </p>
            </div>

            <Link
              href="/practice"
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-[#ad2d1f] px-5 text-sm font-extrabold text-white shadow-[0_8px_16px_rgba(173,45,31,0.20)] transition hover:bg-[#992719] sm:self-end"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              New practice session
            </Link>
          </div>

          {error ? (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">{error}</div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-[10px] border border-slate-200 bg-white p-6 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-500">Loading your history...</p>
            </div>
          ) : null}

          {!error ? (
            <section className="flex flex-col gap-3 rounded-[18px] border border-[#e8ded4] bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {historyFilters.map((filter) => {
                  const isActive = activeFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActiveFilter(filter.value)}
                      className={cn(
                        'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition',
                        isActive ? 'bg-[#ad2d1f] text-white shadow-sm' : 'bg-transparent text-[#7a6e68] hover:bg-[#f5eee8] hover:text-[#271f1b]'
                      )}
                    >
                      <span>{filter.label}</span>
                      <span
                        className={cn(
                          'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs',
                          isActive ? 'bg-white/18 text-white' : 'bg-[#f1ece6] text-[#9b8f87]'
                        )}
                      >
                        {filterCounts[filter.value]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search sessions"
                  className="h-10 rounded-full border-[#e8ded4] bg-white pl-10 pr-10 text-sm font-medium text-[#271f1b] placeholder:text-[#9b8f87] focus-visible:ring-[#ad2d1f]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear history search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {!isLoading && !error && sessions.length === 0 && !searchQuery.trim() ? (
            <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <HistoryIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-base font-bold text-slate-950">No completed sessions yet</p>
              <p className="max-w-sm text-sm font-semibold text-slate-500">
                Finish a behavioral, technical, resume-based, job-posting, or general practice session to see it show up here.
              </p>
              <Link
                href="/practice"
                className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500"
              >
                Start Practicing
              </Link>
            </div>
          ) : null}

          {!isLoading && !error && sessions.length === 0 && searchQuery.trim() ? (
            <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <Search className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-base font-bold text-slate-950">No matching sessions</p>
              <p className="max-w-sm text-sm font-semibold text-slate-500">
                Try a different question, answer keyword, or interview type.
              </p>
            </div>
          ) : null}

          {!isLoading && !error && sessions.length > 0 && filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <HistoryIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-base font-bold text-slate-950">No {selectedFilterLabel.toLowerCase()} sessions yet</p>
              <p className="max-w-sm text-sm font-semibold text-slate-500">
                Choose another filter or complete a {selectedFilterLabel.toLowerCase()} interview to see it here.
              </p>
            </div>
          ) : null}

          {!isLoading && filteredSessions.length > 0 ? (
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const formattedDate = formatDate(session.completed_at);
                const formattedDuration = formatDuration(session.duration_minutes);
                const progress = session.question_count > 0 ? (session.answered_count / session.question_count) * 100 : 0;

                return (
                  <Link
                    key={session.session_id}
                    href={`/history/${session.session_id}`}
                    className="group block rounded-[18px] border border-[#e8ded4] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d9c8bb] hover:shadow-md sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-extrabold tracking-normal text-[#271f1b] sm:text-lg">
                            {formatSessionType(session.session_type)} Interview
                          </p>
                          <span className="rounded-full bg-[#f8e5df] px-3 py-1 text-xs font-extrabold uppercase tracking-normal text-[#9f2d20]">
                            {formatSessionType(session.session_type)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#7a6e68]">
                          {formattedDate ? (
                            <span className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4" aria-hidden="true" />
                              {formattedDate}
                            </span>
                          ) : null}
                          <span className="flex items-center gap-2">
                            <ListChecks className="h-4 w-4" aria-hidden="true" />
                            {session.answered_count}/{session.question_count} answered
                          </span>
                          {formattedDuration ? (
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4" aria-hidden="true" />
                              {formattedDuration}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 h-1.5 w-full max-w-[360px] overflow-hidden rounded-full bg-[#f1e5de]">
                          <div
                            className="h-full rounded-full bg-[#ad2d1f]"
                            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-extrabold',
                            getRatingTone(session.average_rating)
                          )}
                        >
                          <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                          {typeof session.average_rating === 'number' ? `${session.average_rating.toFixed(1)}/5` : 'Not rated'}
                        </span>
                        <ChevronRight
                          className="h-5 w-5 text-[#7a6e68] transition group-hover:translate-x-1 group-hover:text-[#ad2d1f]"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
