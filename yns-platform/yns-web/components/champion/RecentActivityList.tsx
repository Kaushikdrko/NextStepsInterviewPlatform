import Link from 'next/link';

import { formatDate, formatScore, GOAL_TYPE_LABELS, QUESTION_MODE_LABELS } from '@/lib/champion/helpers';
import type { ActivityItem } from '@/lib/champion/types';
import { ReviewStatusBadge } from '@/components/champion/StatusBadges';

export function RecentActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm font-semibold text-slate-500">No recent interview activity yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href="/champion/interviews"
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{item.studentName}</p>
            <p className="text-xs font-semibold text-slate-500">
              {GOAL_TYPE_LABELS[item.interviewPurpose]} · {QUESTION_MODE_LABELS[item.questionMode]} · {formatDate(item.date)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-extrabold text-slate-950">{formatScore(item.score)}</span>
            <ReviewStatusBadge status={item.reviewStatus} />
          </div>
        </Link>
      ))}
    </div>
  );
}
