'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Star } from 'lucide-react';

import { ChampionModal } from '@/components/champion/ChampionModal';
import { ChampionPageHeader } from '@/components/champion/ChampionPageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/champion/ChampionUI';
import { InterviewReviewTable } from '@/components/champion/InterviewReviewTable';
import { ReviewStatusBadge } from '@/components/champion/StatusBadges';
import {
  formatDate,
  formatScore,
  GOAL_TYPE_LABELS,
  QUESTION_MODE_LABELS,
  REVIEW_STATUS_LABELS,
} from '@/lib/champion/helpers';
import {
  getInterviewReviewDetail,
  getInterviewReviews,
  updateInterviewReview,
} from '@/lib/champion/service';
import type { InterviewReview, InterviewReviewDetail, QuestionMode, ReviewStatus } from '@/lib/champion/types';

const selectClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export default function ChampionInterviewsPage() {
  const [reviews, setReviews] = useState<InterviewReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<QuestionMode | 'all'>('all');
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | 'all'>('all');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InterviewReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const data = await getInterviewReviews();
        if (isMounted) setReviews(data);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load interviews.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) => {
      if (query && !review.studentName.toLowerCase().includes(query)) return false;
      if (modeFilter !== 'all' && review.questionMode !== modeFilter) return false;
      if (reviewFilter !== 'all' && review.reviewStatus !== reviewFilter) return false;
      return true;
    });
  }, [reviews, search, modeFilter, reviewFilter]);

  async function openDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    const data = await getInterviewReviewDetail(id);
    setDetail(data);
    setReviewNotes(data?.championReviewNotes ?? '');
    setDetailLoading(false);
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setReviewNotes('');
  }

  async function saveReview(status: ReviewStatus) {
    if (!detail) return;
    setSaving(true);
    const updated = await updateInterviewReview(detail.id, status, reviewNotes);
    if (updated) {
      setReviews((prev) => prev.map((review) => (review.id === updated.id ? { ...review, reviewStatus: status } : review)));
      setDetail(updated);
    }
    setSaving(false);
  }

  return (
    <>
      <ChampionPageHeader
        title="Interview Reviews"
        subtitle="Review AI interview results from your students and mark them as reviewed."
        breadcrumbs={[{ label: 'Champion', href: '/champion' }, { label: 'Interviews' }]}
      />

      {error ? <ErrorState message={error} /> : null}

      <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student…"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label="Search interviews by student"
          />
          <select className={selectClass} value={modeFilter} onChange={(event) => setModeFilter(event.target.value as QuestionMode | 'all')} aria-label="Filter by question mode">
            <option value="all">All modes</option>
            {(Object.keys(QUESTION_MODE_LABELS) as QuestionMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {QUESTION_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
          <select className={selectClass} value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ReviewStatus | 'all')} aria-label="Filter by review status">
            <option value="all">All review states</option>
            {(Object.keys(REVIEW_STATUS_LABELS) as ReviewStatus[]).map((status) => (
              <option key={status} value={status}>
                {REVIEW_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading interviews…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Star} title="No interviews match your filters" description="Adjust your search or filters to see more." />
      ) : (
        <InterviewReviewTable reviews={filtered} onSelect={openDetail} />
      )}

      <ChampionModal
        open={selectedId !== null}
        onClose={closeDetail}
        title={detail ? `${detail.studentName} — Interview Review` : 'Interview Review'}
        description={
          detail ? `${GOAL_TYPE_LABELS[detail.interviewPurpose]} · ${QUESTION_MODE_LABELS[detail.questionMode]} · ${formatDate(detail.date)}` : undefined
        }
        footer={
          detail ? (
            <>
              <button
                type="button"
                onClick={() => saveReview('needs_follow_up')}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Needs Follow-Up
              </button>
              <button
                type="button"
                onClick={() => saveReview('reviewed')}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                Mark as Reviewed
              </button>
            </>
          ) : null
        }
      >
        {detailLoading || !detail ? (
          <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading interview…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-extrabold text-slate-950">{formatScore(detail.score)}</span>
              <ReviewStatusBadge status={detail.reviewStatus} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-950">Questions Asked</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
                {detail.questions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-950">Response Summary</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{detail.transcriptSummary}</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-950">AI Feedback</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{detail.feedbackSummary}</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-950">Score Breakdown</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {detail.scoreBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                    <span className="text-sm font-extrabold text-slate-950">{item.score}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-emerald-700">Strengths</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
                  {detail.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-700">Improvement Areas</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
                  {detail.improvementAreas.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <h3 className="text-sm font-bold text-indigo-800">Recommended Next Practice</h3>
              <p className="mt-1 text-sm font-semibold text-indigo-900">{detail.recommendedNextPractice}</p>
            </div>

            <div>
              <label htmlFor="review-notes" className="text-sm font-bold text-slate-950">
                Champion Review Notes
              </label>
              <textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                rows={3}
                placeholder="Add a private note about this review…"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        )}
      </ChampionModal>
    </>
  );
}
