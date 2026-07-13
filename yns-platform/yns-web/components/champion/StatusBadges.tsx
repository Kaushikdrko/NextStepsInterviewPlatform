import { Eye, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  ASSIGNMENT_STATUS_CLASSES,
  ASSIGNMENT_STATUS_LABELS,
  MEETING_STATUS_CLASSES,
  MEETING_STATUS_LABELS,
  NOTE_VISIBILITY_LABELS,
  readinessTone,
  REVIEW_STATUS_CLASSES,
  REVIEW_STATUS_LABELS,
  SKILL_STATUS_CLASSES,
  SKILL_STATUS_LABELS,
  STUDENT_STATUS_CLASSES,
  STUDENT_STATUS_DOT,
  STUDENT_STATUS_LABELS,
} from '@/lib/champion/helpers';
import type {
  AssignmentStatus,
  MeetingStatus,
  NoteVisibility,
  ReviewStatus,
  SkillStatus,
  StudentStatus,
} from '@/lib/champion/types';

const baseBadge = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold';

export function StudentStatusBadge({ status, className }: { status: StudentStatus; className?: string }) {
  return (
    <span className={cn(baseBadge, STUDENT_STATUS_CLASSES[status], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', STUDENT_STATUS_DOT[status])} aria-hidden="true" />
      {STUDENT_STATUS_LABELS[status]}
    </span>
  );
}

export function ReadinessBadge({ score, className }: { score: number | null; className?: string }) {
  const tone = readinessTone(score);
  return (
    <span className={cn(baseBadge, tone.className, className)}>
      {typeof score === 'number' ? `${score}% · ${tone.label}` : tone.label}
    </span>
  );
}

export function SkillStatusBadge({ status, className }: { status: SkillStatus; className?: string }) {
  return <span className={cn(baseBadge, SKILL_STATUS_CLASSES[status], className)}>{SKILL_STATUS_LABELS[status]}</span>;
}

export function ReviewStatusBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  return <span className={cn(baseBadge, REVIEW_STATUS_CLASSES[status], className)}>{REVIEW_STATUS_LABELS[status]}</span>;
}

export function AssignmentStatusBadge({ status, className }: { status: AssignmentStatus; className?: string }) {
  return (
    <span className={cn(baseBadge, ASSIGNMENT_STATUS_CLASSES[status], className)}>{ASSIGNMENT_STATUS_LABELS[status]}</span>
  );
}

export function MeetingStatusBadge({ status, className }: { status: MeetingStatus; className?: string }) {
  return <span className={cn(baseBadge, MEETING_STATUS_CLASSES[status], className)}>{MEETING_STATUS_LABELS[status]}</span>;
}

export function NoteVisibilityBadge({ visibility, className }: { visibility: NoteVisibility; className?: string }) {
  const isPrivate = visibility === 'private';
  return (
    <span
      className={cn(
        baseBadge,
        isPrivate ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        className,
      )}
    >
      {isPrivate ? <Lock className="h-3 w-3" aria-hidden="true" /> : <Eye className="h-3 w-3" aria-hidden="true" />}
      {NOTE_VISIBILITY_LABELS[visibility]}
    </span>
  );
}
