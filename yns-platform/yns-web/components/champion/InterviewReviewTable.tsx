import { formatDate, formatScore, GOAL_TYPE_LABELS, QUESTION_MODE_LABELS } from '@/lib/champion/helpers';
import type { InterviewReview } from '@/lib/champion/types';
import { ReviewStatusBadge } from '@/components/champion/StatusBadges';

export function InterviewReviewTable({
  reviews,
  onSelect,
}: {
  reviews: InterviewReview[];
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-[10px] border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                <td className="px-4 py-3 font-bold text-slate-950">{review.studentName}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{GOAL_TYPE_LABELS[review.interviewPurpose]}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{QUESTION_MODE_LABELS[review.questionMode]}</td>
                <td className="px-4 py-3 font-semibold text-slate-500">{formatDate(review.date)}</td>
                <td className="px-4 py-3 font-extrabold text-slate-950">{formatScore(review.score)}</td>
                <td className="px-4 py-3">
                  <ReviewStatusBadge status={review.reviewStatus} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(review.id)}
                    className="inline-flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 lg:hidden">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950">{review.studentName}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {GOAL_TYPE_LABELS[review.interviewPurpose]} · {QUESTION_MODE_LABELS[review.questionMode]} · {formatDate(review.date)}
                </p>
              </div>
              <span className="text-sm font-extrabold text-slate-950">{formatScore(review.score)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <ReviewStatusBadge status={review.reviewStatus} />
              <button
                type="button"
                onClick={() => onSelect(review.id)}
                className="inline-flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Review
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
