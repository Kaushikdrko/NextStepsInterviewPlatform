'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, FileText, Plus } from 'lucide-react';

import { AssignmentForm } from '@/components/champion/AssignmentForm';
import { ChampionPageHeader } from '@/components/champion/ChampionPageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/champion/ChampionUI';
import { AssignmentStatusBadge } from '@/components/champion/StatusBadges';
import {
  formatDate,
  GOAL_TYPE_LABELS,
  QUESTION_MODE_LABELS,
} from '@/lib/champion/helpers';
import { createAssignment, getAssignments, getAssignedStudents } from '@/lib/champion/service';
import type { CreateAssignmentInput, PracticeAssignment, StudentSummary } from '@/lib/champion/types';

export default function ChampionAssignmentsPage() {
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const [assignmentData, studentData] = await Promise.all([getAssignments(), getAssignedStudents()]);
        if (!isMounted) return;
        setAssignments(assignmentData);
        setStudents(studentData);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load assignments.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreate(input: CreateAssignmentInput) {
    const created = await createAssignment(input);
    setAssignments((prev) => [created, ...prev]);
  }

  return (
    <>
      <ChampionPageHeader
        title="Practice Assignments"
        subtitle="Assign targeted interview practice and track how students are progressing."
        breadcrumbs={[{ label: 'Champion', href: '/champion' }, { label: 'Assignments' }]}
        actions={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Assign Practice
          </button>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      {isLoading ? (
        <LoadingState label="Loading assignments…" />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description="Assign practice to a student to help them focus on a specific skill."
          action={
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Assign Practice
            </button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-950">{assignment.studentName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {GOAL_TYPE_LABELS[assignment.interviewPurpose]} · {QUESTION_MODE_LABELS[assignment.questionMode]} · Focus: {assignment.focusSkill}
                  </p>
                </div>
                <AssignmentStatusBadge status={assignment.status} />
              </div>

              {assignment.instructions ? (
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{assignment.instructions}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
                <span>Assigned {formatDate(assignment.createdAt)}</span>
                {assignment.dueDate ? <span>Due {formatDate(assignment.dueDate)}</span> : null}
                {assignment.resumeBased ? (
                  <span className="inline-flex items-center gap-1 text-indigo-600">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    Resume-based
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <AssignmentForm open={formOpen} students={students} onClose={() => setFormOpen(false)} onCreate={handleCreate} />
    </>
  );
}
