'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, History as HistoryIcon, ListChecks, Loader2, Star } from 'lucide-react';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { Badge } from '@/components/ui/badge';
import { getSessionHistory, type SessionSummary } from '@/lib/services/interview-assistant';

function formatSessionType(value: string) {
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

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const data = await getSessionHistory();
        if (isMounted) setSessions(data.sessions);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load interview history.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="min-h-screen px-4 py-6 sm:px-6 lg:pl-[220px]">
        <div className="mx-auto w-full max-w-6xl space-y-5 lg:px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Link href="/dashboard" className="transition hover:text-slate-950">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="text-slate-950">History</span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Interview History</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Your last 5 completed practice sessions.</p>
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

          {!isLoading && !error && sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <HistoryIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-base font-bold text-slate-950">No completed sessions yet</p>
              <p className="max-w-sm text-sm font-semibold text-slate-500">
                Finish a behavioral, technical, or general practice session to see it show up here.
              </p>
              <Link
                href="/practice"
                className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500"
              >
                Start Practicing
              </Link>
            </div>
          ) : null}

          {!isLoading && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link
                  key={session.session_id}
                  href={`/history/${session.session_id}`}
                  className="group flex flex-col gap-3 rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-950">{formatSessionType(session.session_type)} Interview</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
                      {formatDate(session.completed_at) ? (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatDate(session.completed_at)}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                        {session.answered_count}/{session.question_count} answered
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Badge className="flex items-center gap-1 border-0 bg-indigo-50 px-3 py-1 text-sm font-extrabold text-indigo-700">
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      {typeof session.average_rating === 'number' ? `${session.average_rating.toFixed(1)}/5` : 'Not rated'}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
