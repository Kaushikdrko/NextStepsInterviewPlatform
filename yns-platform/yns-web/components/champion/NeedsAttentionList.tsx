import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { STUDENT_STATUS_DOT } from '@/lib/champion/helpers';
import type { AttentionAlert } from '@/lib/champion/types';

export function NeedsAttentionList({ alerts }: { alerts: AttentionAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">✓</span>
        All caught up — no students need attention right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', STUDENT_STATUS_DOT[alert.status])} aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-950">{alert.studentName}</p>
              <p className="text-sm font-semibold text-slate-500">{alert.reason}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={`/champion/students/${alert.studentId}`}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              View Student
            </Link>
            <Link
              href="/champion/assignments"
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Assign Practice
            </Link>
            <Link
              href="/champion/notes"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Add Note
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
