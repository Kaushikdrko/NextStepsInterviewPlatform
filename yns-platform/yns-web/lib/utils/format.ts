import type { StudentStatus } from "@/types/champion";

/** Human-readable label for each student status. */
export const STATUS_LABEL: Record<StudentStatus, string> = {
  great: "Great",
  amazing: "Amazing",
  help: "Needs Help",
};

/** Tailwind background color class for the small status dot. */
export const STATUS_DOT: Record<StudentStatus, string> = {
  great: "bg-status-great",
  amazing: "bg-status-amazing",
  help: "bg-status-help",
};

/** Badge variant name (see components/ui/badge.tsx) per status. */
export const STATUS_BADGE_VARIANT: Record<
  StudentStatus,
  "great" | "amazing" | "help"
> = {
  great: "great",
  amazing: "amazing",
  help: "help",
};

export function fullName(person: {
  firstName: string;
  lastName: string;
}): string {
  return `${person.firstName} ${person.lastName}`;
}

export function initials(person: {
  firstName: string;
  lastName: string;
}): string {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

/** Format an ISO date (YYYY-MM-DD) as e.g. "May 3, 2025". */
export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format an ISO datetime time range, e.g. "1:00 PM - 1:30 PM". */
export function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  return `${fmt(startIso)} - ${fmt(endIso)}`;
}

/** Short month + day, e.g. "May 15". */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
