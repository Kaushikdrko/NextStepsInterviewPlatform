'use client';

import { Search } from 'lucide-react';

import {
  EDUCATION_LEVEL_LABELS,
  GOAL_TYPE_LABELS,
  STUDENT_STATUS_LABELS,
} from '@/lib/champion/helpers';
import type { EducationLevel, GoalType, StudentStatus } from '@/lib/champion/types';

export type ReadinessRange = 'all' | 'high' | 'mid' | 'low';

export interface StudentFilterState {
  search: string;
  status: StudentStatus | 'all';
  goalType: GoalType | 'all';
  educationLevel: EducationLevel | 'all';
  readiness: ReadinessRange;
}

const selectClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export function StudentFilters({
  value,
  onChange,
}: {
  value: StudentFilterState;
  onChange: (next: StudentFilterState) => void;
}) {
  function update<K extends keyof StudentFilterState>(key: K, next: StudentFilterState[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={value.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Search by name…"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label="Search students by name"
          />
        </div>

        <select className={selectClass} value={value.status} onChange={(event) => update('status', event.target.value as StudentFilterState['status'])} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {(Object.keys(STUDENT_STATUS_LABELS) as StudentStatus[]).map((status) => (
            <option key={status} value={status}>
              {STUDENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <select className={selectClass} value={value.goalType} onChange={(event) => update('goalType', event.target.value as StudentFilterState['goalType'])} aria-label="Filter by goal type">
          <option value="all">All goals</option>
          {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((goal) => (
            <option key={goal} value={goal}>
              {GOAL_TYPE_LABELS[goal]}
            </option>
          ))}
        </select>

        <select className={selectClass} value={value.educationLevel} onChange={(event) => update('educationLevel', event.target.value as StudentFilterState['educationLevel'])} aria-label="Filter by education level">
          <option value="all">All levels</option>
          {(Object.keys(EDUCATION_LEVEL_LABELS) as EducationLevel[]).map((level) => (
            <option key={level} value={level}>
              {EDUCATION_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>

        <select className={selectClass} value={value.readiness} onChange={(event) => update('readiness', event.target.value as ReadinessRange)} aria-label="Filter by readiness range">
          <option value="all">Any readiness</option>
          <option value="high">High (85%+)</option>
          <option value="mid">Mid (55–84%)</option>
          <option value="low">Low (&lt;55%)</option>
        </select>
      </div>
    </div>
  );
}
