import type { ActivityStatus, DashboardRange } from '@/lib/champion/types';

/**
 * Render a duration the way the dashboard shows it: "0m", "42m", "1h 15m",
 * "18h 32m". Never raw seconds, never a decimal.
 */
export function formatPracticeTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0m';
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** Initials for the avatar. "Klyne Smith" -> "KS", "Cher" -> "C". */
export function initialsFor(fullName: string): string {
  const parts = fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';

  return `${first}${last}`.toUpperCase();
}

/** "Showing 1 to 8 of 8 students" */
export function formatResultRange(page: number, pageSize: number, totalCount: number): string {
  if (totalCount === 0) {
    return 'No students to show';
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);
  const noun = totalCount === 1 ? 'student' : 'students';

  return `Showing ${formatCount(first)} to ${formatCount(last)} of ${formatCount(totalCount)} ${noun}`;
}

/** Fallback copy for a field the schema does not store. */
export function orNotProvided(value: string | null | undefined, missing = 'Not provided'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : missing;
}

const RANGE_DESCRIPTIONS: Record<DashboardRange, string> = {
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
  school_year: 'this school year',
  all_time: 'all time',
};

export function describeRange(range: DashboardRange): string {
  return RANGE_DESCRIPTIONS[range];
}

const STATUS_EMPTY_MESSAGES: Record<ActivityStatus, string> = {
  all: 'No students match your search or filters.',
  active: 'No students have practiced during this time range.',
  inactive: 'No students have gone quiet during this time range.',
  never_started: 'Every student has started practicing.',
};

export function emptyResultMessage(status: ActivityStatus, hasSearch: boolean): string {
  if (hasSearch) {
    return 'No students match your search or filters.';
  }
  return STATUS_EMPTY_MESSAGES[status];
}
