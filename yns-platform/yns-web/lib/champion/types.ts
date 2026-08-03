// Champion Dashboard models. These mirror the Pydantic schemas in
// yns-api/app/api/champion/models.py, which serialize in camelCase.

export type ActivityStatus = 'all' | 'active' | 'inactive' | 'never_started';

export type DashboardRange = '7d' | '30d' | 'school_year' | 'all_time';

export type StudentSortField =
  | 'fullName'
  | 'questionsAnswered'
  | 'interviewsCompleted'
  | 'practiceTime';

export type SortOrder = 'asc' | 'desc';

export interface ChampionProfile {
  id: string;
  fullName: string;
  email: string | null;
  roleLabel: string;
}

export interface ChampionStudentListItem {
  id: string;
  fullName: string;
  questionsAnswered: number;
  interviewsCompleted: number;
  practiceTimeSeconds: number;
}

export interface ChampionStudentDetails {
  id: string;
  fullName: string;
  school: string | null;
  gradeOrYear: string | null;
  studentType: string | null;
  email: string | null;
  phone: string | null;
  questionsAnswered: number;
  interviewsCompleted: number;
  practiceTimeSeconds: number;
}

export interface ChampionStudentListResponse {
  students: ChampionStudentListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ChampionStudentQuery {
  search: string;
  status: ActivityStatus;
  range: DashboardRange;
  sortBy: StudentSortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

export const DEFAULT_RANGE: DashboardRange = '30d';
export const DEFAULT_STATUS: ActivityStatus = 'all';
export const DEFAULT_SORT_BY: StudentSortField = 'fullName';
export const DEFAULT_SORT_ORDER: SortOrder = 'asc';
export const DEFAULT_PAGE_SIZE = 25;

export const RANGE_OPTIONS: ReadonlyArray<{ value: DashboardRange; label: string }> = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'school_year', label: 'School Year' },
  { value: 'all_time', label: 'All Time' },
];

export const STATUS_OPTIONS: ReadonlyArray<{ value: ActivityStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'never_started', label: 'Never Started' },
];

const RANGE_VALUES = RANGE_OPTIONS.map((option) => option.value);
const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value);
const SORT_FIELDS: StudentSortField[] = [
  'fullName',
  'questionsAnswered',
  'interviewsCompleted',
  'practiceTime',
];

// The dashboard reads its state out of the URL, which anyone can edit. Fall back
// to the default rather than sending a value the API would reject with a 422.
export function parseRange(value: string | null): DashboardRange {
  return RANGE_VALUES.includes(value as DashboardRange) ? (value as DashboardRange) : DEFAULT_RANGE;
}

export function parseStatus(value: string | null): ActivityStatus {
  return STATUS_VALUES.includes(value as ActivityStatus)
    ? (value as ActivityStatus)
    : DEFAULT_STATUS;
}

export function parseSortBy(value: string | null): StudentSortField {
  return SORT_FIELDS.includes(value as StudentSortField)
    ? (value as StudentSortField)
    : DEFAULT_SORT_BY;
}

export function parseSortOrder(value: string | null): SortOrder {
  return value === 'desc' ? 'desc' : DEFAULT_SORT_ORDER;
}

export function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}
