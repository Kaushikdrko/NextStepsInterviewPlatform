import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';

import type { SessionSummary } from '@/lib/services/interview-assistant';

type RecentSessionsProps = {
  sessions: SessionSummary[];
};

function formatSessionType(value: string) {
  if (value === 'mixed') return 'General';
  if (value === 'resume') return 'Resume-Based';

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSessionDate(value: string | null) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((today.getTime() - sessionDay.getTime()) / 86_400_000);
  const time = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);

  if (dayDifference === 0) return `Today, ${time}`;
  if (dayDifference === 1) return `Yesterday, ${time}`;

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatScore(score: number | null) {
  if (typeof score !== 'number') return 'Not rated';
  return `${Math.round((score / 5) * 100)}%`;
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <section className="flex flex-1 flex-col rounded-[14px] border border-[#e7dbd0] bg-white px-5 py-4 shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
          <h2 className="text-sm font-extrabold text-[#271f1b]">Recent sessions</h2>
        </div>
        <Link href="/history" className="text-xs font-extrabold text-[#ad2d1f] transition hover:text-[#8f2419]">
          View all
        </Link>
      </div>

      {sessions.length > 0 ? (
        <div className="mt-3 flex-1 divide-y divide-[#eee5de]">
          {sessions.map((session) => (
            <Link
              key={session.session_id}
              href={`/history/${session.session_id}`}
              className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-2 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fff2ed] text-[#ad2d1f]">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[#271f1b]">{formatSessionType(session.session_type)} Interview</p>
                <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-5 text-[#9a8d86] sm:truncate">
                  {session.answered_count} {session.answered_count === 1 ? 'question' : 'questions'} · {formatSessionDate(session.completed_at)}
                </p>
              </div>
              <span className="rounded-full bg-[#fff2ed] px-3 py-1 text-xs font-extrabold text-[#ad2d1f]">
                {formatScore(session.average_rating)}
              </span>
              <ChevronRight className="hidden h-4 w-4 text-[#aa9d95] transition group-hover:translate-x-0.5 group-hover:text-[#ad2d1f] sm:block" aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-[#e7dbd0] px-4 py-6 text-center">
          <p className="text-sm font-bold text-[#71645e]">No completed sessions yet</p>
          <Link href="/practice" className="mt-2 inline-block text-xs font-extrabold text-[#ad2d1f]">
            Start your first practice session
          </Link>
        </div>
      )}
    </section>
  );
}
