'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Clock3, X } from 'lucide-react';

import {
  getWeeklyGoal,
  updateWeeklyGoal,
  type WeeklyGoalResponse,
} from '@/lib/services/interview-assistant';

const emptyGoal: WeeklyGoalResponse = {
  target_sessions: 5,
  completed_sessions: 0,
  percent_complete: 0,
  week_start: '',
  week_end: '',
};

function clampGoal(value: number) {
  return Math.max(1, Math.min(50, Math.round(value)));
}

export function WeeklyGoalCard() {
  const [goal, setGoal] = useState<WeeklyGoalResponse>(emptyGoal);
  const [draftGoal, setDraftGoal] = useState(String(emptyGoal.target_sessions));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function refreshGoal() {
      try {
        const nextGoal = await getWeeklyGoal();
        if (isMounted) {
          setGoal(nextGoal);
          setDraftGoal(String(nextGoal.target_sessions));
          setError(null);
        }
      } catch {
        if (isMounted) {
          setGoal(emptyGoal);
          setDraftGoal(String(emptyGoal.target_sessions));
          setError('Unable to load your weekly goal.');
        }
      }
    }

    void refreshGoal();

    const handleRefresh = () => void refreshGoal();
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = clampGoal(Number(draftGoal) || goal.target_sessions);

    setIsSaving(true);
    setError(null);
    try {
      const nextGoal = await updateWeeklyGoal(target);
      setGoal(nextGoal);
      setDraftGoal(String(nextGoal.target_sessions));
      setIsEditing(false);
    } catch {
      setError('Unable to save your weekly goal.');
    } finally {
      setIsSaving(false);
    }
  }

  const percent = Math.max(0, Math.min(100, goal.percent_complete));
  const remaining = Math.max(0, goal.target_sessions - goal.completed_sessions);
  const sessionLabel = goal.target_sessions === 1 ? 'session' : 'sessions';
  const completedLabel = goal.completed_sessions === 1 ? 'session' : 'sessions';

  return (
    <section className="rounded-[14px] border border-[#e7dbd0] bg-white p-4 shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-[#ad2d1f]" aria-hidden="true" />
          <h2 className="truncate text-sm font-extrabold text-[#271f1b]">Weekly goal</h2>
        </div>
        <span className="rounded-full bg-[#fff2ed] px-3 py-1 text-[11px] font-extrabold text-[#ad2d1f]">This week</span>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
          <label className="text-xs font-bold text-[#71645e]" htmlFor="weekly-goal-target">
            Sessions
          </label>
          <input
            id="weekly-goal-target"
            min={1}
            max={50}
            type="number"
            value={draftGoal}
            onChange={(event) => setDraftGoal(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-lg border border-[#e3d4c7] bg-white px-3 text-sm font-bold text-[#271f1b] outline-none transition focus:border-[#ad2d1f] focus:ring-2 focus:ring-[#f4d7cd]"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ad2d1f] text-white transition hover:bg-[#942417] disabled:opacity-60"
            aria-label="Save weekly goal"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setDraftGoal(String(goal.target_sessions));
              setError(null);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3d4c7] text-[#8a7c75] transition hover:bg-[#fbf6f1]"
            aria-label="Cancel weekly goal edit"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      ) : (
        <div className="mt-4 flex items-baseline gap-2">
          <span className="min-w-[1ch] text-[28px] font-black leading-none tabular-nums text-[#271f1b]">
            {goal.completed_sessions}
          </span>
          <span className="text-sm font-bold text-[#b2a49d]" aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded text-sm font-bold tabular-nums text-[#746761] outline-none transition hover:text-[#ad2d1f] focus-visible:ring-2 focus-visible:ring-[#e7b7a9]"
            title="Change weekly goal"
          >
            <span className="font-extrabold text-[#5f514b]">{goal.target_sessions}</span> {sessionLabel}
          </button>
        </div>
      )}

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadfd5]">
        <div
          className="h-full rounded-full bg-[#ad2d1f] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2.5 text-xs font-medium leading-5 text-[#8a7c75]">
        {remaining > 0
          ? `${remaining} ${remaining === 1 ? 'session' : 'sessions'} left to hit your weekly goal.`
          : `Goal complete. You finished ${goal.completed_sessions} ${completedLabel} this week.`}
      </p>

      {error ? <p className="mt-2 text-xs font-semibold text-[#ad2d1f]">{error}</p> : null}
    </section>
  );
}
