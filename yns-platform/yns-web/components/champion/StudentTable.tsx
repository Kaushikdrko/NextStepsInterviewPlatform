import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { EDUCATION_LEVEL_LABELS, formatDate, formatScore, GOAL_TYPE_LABELS } from '@/lib/champion/helpers';
import type { StudentSummary } from '@/lib/champion/types';
import { ReadinessBadge, StudentStatusBadge } from '@/components/champion/StatusBadges';

function ViewProfileLink({ id }: { id: string }) {
  return (
    <Link
      href={`/champion/students/${id}`}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
    >
      View Profile
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export function StudentTable({ students }: { students: StudentSummary[] }) {
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-[10px] border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">School / Year</th>
              <th className="px-4 py-3">Goal</th>
              <th className="px-4 py-3">Latest</th>
              <th className="px-4 py-3">Readiness</th>
              <th className="px-4 py-3">Interviews</th>
              <th className="px-4 py-3">Last Practice</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-950">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">{student.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-700">{student.school ?? '—'}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {EDUCATION_LEVEL_LABELS[student.educationLevel]}
                    {student.year ? ` · ${student.year}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">{GOAL_TYPE_LABELS[student.goalType]}</td>
                <td className="px-4 py-3 font-bold text-slate-950">{formatScore(student.latestScore)}</td>
                <td className="px-4 py-3">
                  <ReadinessBadge score={student.readinessScore} />
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">{student.completedInterviews}</td>
                <td className="px-4 py-3 font-semibold text-slate-500">{formatDate(student.lastPracticeDate)}</td>
                <td className="px-4 py-3">
                  <StudentStatusBadge status={student.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <ViewProfileLink id={student.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <div className="grid gap-3 lg:hidden">
        {students.map((student) => (
          <div key={student.id} className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs font-semibold text-slate-500">{student.email}</p>
              </div>
              <StudentStatusBadge status={student.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
              <span>School: <span className="text-slate-700">{student.school ?? '—'}</span></span>
              <span>Goal: <span className="text-slate-700">{GOAL_TYPE_LABELS[student.goalType]}</span></span>
              <span>Latest: <span className="text-slate-700">{formatScore(student.latestScore)}</span></span>
              <span>Interviews: <span className="text-slate-700">{student.completedInterviews}</span></span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <ReadinessBadge score={student.readinessScore} />
              <ViewProfileLink id={student.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
