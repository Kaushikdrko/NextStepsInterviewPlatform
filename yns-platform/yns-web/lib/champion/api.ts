// Champion Dashboard data service. Every call goes through the shared
// apiFetch helper, which attaches the Supabase bearer token; the API rejects
// anyone without the champion role.

import type {
  ChampionProfile,
  ChampionStudentDetails,
  ChampionStudentListResponse,
  ChampionStudentQuery,
  DashboardRange,
} from '@/lib/champion/types';
import { apiFetch } from '@/lib/utils/api-client';

/** Canonical query string — also used as the response cache key. */
export function buildStudentQueryString(query: ChampionStudentQuery): string {
  const params = new URLSearchParams();
  const search = query.search.trim();

  if (search) {
    params.set('search', search);
  }
  params.set('status', query.status);
  params.set('range', query.range);
  params.set('sortBy', query.sortBy);
  params.set('sortOrder', query.sortOrder);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));

  return params.toString();
}

export function fetchChampionStudents(
  query: ChampionStudentQuery,
  signal?: AbortSignal,
): Promise<ChampionStudentListResponse> {
  return apiFetch<ChampionStudentListResponse>(
    `/api/champion/students?${buildStudentQueryString(query)}`,
    { signal },
  );
}

export function fetchChampionStudentDetails(
  studentId: string,
  range: DashboardRange,
  signal?: AbortSignal,
): Promise<ChampionStudentDetails> {
  return apiFetch<ChampionStudentDetails>(
    `/api/champion/students/${encodeURIComponent(studentId)}?range=${range}`,
    { signal },
  );
}

export function fetchChampionProfile(signal?: AbortSignal): Promise<ChampionProfile> {
  return apiFetch<ChampionProfile>('/api/champion/me', { signal });
}
