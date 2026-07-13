// Presentation helpers for the Champion Dashboard: human-readable labels and the
// Your Next Steps-US status color mapping shared across components.

import type {
  AssignmentStatus,
  EducationLevel,
  GoalType,
  MeetingStatus,
  MeetingType,
  NoteCategory,
  NoteVisibility,
  QuestionMode,
  ReviewStatus,
  SkillStatus,
  StudentStatus,
} from './types';

function titleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  on_track: 'On Track',
  excellent: 'Excellent',
  watch: 'Watch',
  needs_help: 'Needs Help',
  not_started: 'Not Started',
};

// Tailwind class sets keyed by the required YNS status palette:
// green = on track, gold/amber = excellent, yellow = watch, red = needs help, gray = not started.
export const STUDENT_STATUS_CLASSES: Record<StudentStatus, string> = {
  on_track: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  excellent: 'border-amber-200 bg-amber-50 text-amber-700',
  watch: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  needs_help: 'border-rose-200 bg-rose-50 text-rose-700',
  not_started: 'border-slate-200 bg-slate-100 text-slate-600',
};

export const STUDENT_STATUS_DOT: Record<StudentStatus, string> = {
  on_track: 'bg-emerald-500',
  excellent: 'bg-amber-500',
  watch: 'bg-yellow-500',
  needs_help: 'bg-rose-500',
  not_started: 'bg-slate-400',
};

export const SKILL_STATUS_LABELS: Record<SkillStatus, string> = {
  strong: 'Strong',
  good: 'Good',
  needs_practice: 'Needs Practice',
  needs_help: 'Needs Help',
};

export const SKILL_STATUS_CLASSES: Record<SkillStatus, string> = {
  strong: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  good: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  needs_practice: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  needs_help: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const SKILL_BAR_CLASSES: Record<SkillStatus, string> = {
  strong: 'bg-emerald-500',
  good: 'bg-indigo-500',
  needs_practice: 'bg-yellow-500',
  needs_help: 'bg-rose-500',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending Review',
  reviewed: 'Reviewed',
  needs_follow_up: 'Needs Follow-Up',
};

export const REVIEW_STATUS_CLASSES: Record<ReviewStatus, string> = {
  pending: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  reviewed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  needs_follow_up: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const ASSIGNMENT_STATUS_CLASSES: Record<AssignmentStatus, string> = {
  assigned: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  in_progress: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const MEETING_STATUS_CLASSES: Record<MeetingStatus, string> = {
  scheduled: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
  no_show: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const NOTE_VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  student_visible: 'Visible to Student',
  private: 'Private Mentor Note',
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  internship: 'Internship',
  job: 'Job',
  college: 'College',
  scholarship: 'Scholarship',
};

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  high_school: 'High School',
  college: 'College',
  recent_grad: 'Recent Graduate',
};

export const QUESTION_MODE_LABELS: Record<QuestionMode, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  situational: 'Situational',
  mixed: 'Mixed',
};

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  interview_prep: 'Interview Prep',
  scholarship_guidance: 'Scholarship Guidance',
  career_question: 'Career Question',
  general: 'General',
  mock_interview: 'Mock Interview',
};

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  general: 'General',
  interview_feedback: 'Interview Feedback',
  encouragement: 'Encouragement',
  practice_assignment: 'Practice Assignment',
  follow_up: 'Follow-Up',
};

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function formatScore(score: number | null): string {
  return typeof score === 'number' ? `${score}%` : '—';
}

export function readinessTone(score: number | null): { label: string; className: string } {
  if (score === null) return { label: 'Not Started', className: 'border-slate-200 bg-slate-100 text-slate-600' };
  if (score >= 85) return { label: 'Excellent', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  if (score >= 70) return { label: 'On Track', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (score >= 55) return { label: 'Watch', className: 'border-yellow-200 bg-yellow-50 text-yellow-800' };
  return { label: 'Needs Help', className: 'border-rose-200 bg-rose-50 text-rose-700' };
}

export { titleCase };
