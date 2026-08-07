'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Info, Star } from 'lucide-react';

import { getFocusArea, type FocusAreaResponse } from '@/lib/services/interview-assistant';

const emptyFocusArea: FocusAreaResponse = {
  focus_area: null,
  detail: 'Complete an interview session to unlock a personalized focus area.',
  supporting_category: null,
  average_recent_score: null,
  report_count: 0,
};

export function FocusAreaCard() {
  const [focusArea, setFocusArea] = useState<FocusAreaResponse>(emptyFocusArea);

  useEffect(() => {
    let isMounted = true;

    async function refreshFocusArea() {
      try {
        const nextFocusArea = await getFocusArea();
        if (isMounted) {
          setFocusArea(nextFocusArea);
        }
      } catch {
        if (isMounted) {
          setFocusArea(emptyFocusArea);
        }
      }
    }

    void refreshFocusArea();

    const handleRefresh = () => void refreshFocusArea();
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, []);

  const hasFocusArea = Boolean(focusArea.focus_area);
  const roundedScore = typeof focusArea.average_recent_score === 'number' ? Math.round(focusArea.average_recent_score) : 0;
  const focusTitle = focusArea.supporting_category ?? focusArea.focus_area;
  const focusLabel = focusTitle?.toLocaleLowerCase();

  return (
    <section className="flex min-h-[230px] flex-1 flex-col rounded-[14px] border border-[#e7dbd0] bg-white p-4 shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-[#ad2d1f]" aria-hidden="true" />
          <h2 className="truncate text-sm font-extrabold text-[#271f1b]">Focus area</h2>
        </div>
        <span className="shrink-0 rounded-full bg-[#fff2ed] px-3 py-1 text-[11px] font-extrabold text-[#ad2d1f]">
          {focusArea.report_count} {focusArea.report_count === 1 ? 'report' : 'reports'}
        </span>
      </div>

      <div className="mt-5 flex-1">
        <p className="text-lg font-black leading-6 text-[#271f1b]">{focusTitle ?? 'No focus trend yet'}</p>
        <p className="mt-1 text-xs font-medium text-[#8a7c75]">
          {focusTitle ? 'Your main improvement area' : 'Complete more sessions to reveal a trend'}
        </p>

        {typeof focusArea.average_recent_score === 'number' ? (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-0.5" aria-label={`${focusArea.average_recent_score} out of 5 average`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={`h-3.5 w-3.5 ${value <= roundedScore ? 'fill-[#ad2d1f] text-[#ad2d1f]' : 'text-[#d8cdc5]'}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="text-xs font-extrabold text-[#5f514b]">{focusArea.average_recent_score}/5 avg</span>
          </div>
        ) : null}

        <p className="mt-4 max-w-[26ch] text-xs font-medium leading-5 text-[#8a7c75]">
          {focusArea.report_count > 0
            ? `Based on ${focusArea.report_count} recent AI feedback ${focusArea.report_count === 1 ? 'report' : 'reports'}.`
            : focusArea.detail}
        </p>

        {hasFocusArea ? (
          <div className="mt-5 rounded-xl bg-[#fcf7f3] p-3.5">
            <p className="text-xs font-extrabold text-[#5f514b]">What to work on</p>
            <ul className="mt-2.5 space-y-2 text-xs font-medium leading-5 text-[#7f716a]">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ad2d1f]" aria-hidden="true" />
                <span>{focusArea.detail}</span>
              </li>
              {focusLabel ? (
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ad2d1f]" aria-hidden="true" />
                  <span>Focus your next practice session on {focusLabel} and compare the new feedback with your recent reports.</span>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-[#eee5de] pt-3">
        <Link
          href={hasFocusArea ? '/practice' : '/history'}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#ad2d1f] transition hover:text-[#8f2419]"
        >
          {hasFocusArea ? 'Practice this' : 'View history'}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
