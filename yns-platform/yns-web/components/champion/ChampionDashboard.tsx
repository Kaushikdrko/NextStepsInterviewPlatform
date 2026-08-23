'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Info } from 'lucide-react';

import { ChampionHeader } from '@/components/champion/ChampionHeader';
import { ChampionPagination } from '@/components/champion/ChampionPagination';
import { ChampionStudentTable } from '@/components/champion/ChampionStudentTable';
import { DashboardRangeSelector } from '@/components/champion/DashboardRangeSelector';
import { StudentActivityFilters } from '@/components/champion/StudentActivityFilters';
import { StudentDetailsDrawer } from '@/components/champion/StudentDetailsDrawer';
import { StudentSearch } from '@/components/champion/StudentSearch';
import {
  StudentTableEmptyState,
  StudentTableErrorState,
  StudentTableSkeleton,
} from '@/components/champion/StudentTableStates';
import { useChampionStudentDetails } from '@/hooks/use-champion-student-details';
import { useChampionStudents } from '@/hooks/use-champion-students';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { emptyResultMessage, formatResultRange } from '@/lib/champion/format';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_STATUS,
  parsePage,
  parseRange,
  parseSortBy,
  parseSortOrder,
  parseStatus,
  type ActivityStatus,
  type DashboardRange,
  type SortOrder,
  type StudentSortField,
} from '@/lib/champion/types';

const SEARCH_DEBOUNCE_MS = 300;

export function ChampionDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the single source of truth for everything the API needs, so a
  // dashboard can be refreshed, bookmarked or shared without losing its state.
  const range = parseRange(searchParams.get('range'));
  const status = parseStatus(searchParams.get('status'));
  const sortBy = parseSortBy(searchParams.get('sortBy'));
  const sortOrder = parseSortOrder(searchParams.get('sortOrder'));
  const page = parsePage(searchParams.get('page'));
  const urlSearch = searchParams.get('search') ?? '';
  const selectedStudentId = searchParams.get('studentId');

  const query = useMemo(
    () => ({
      search: urlSearch,
      status,
      range,
      sortBy,
      sortOrder,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    [urlSearch, status, range, sortBy, sortOrder, page],
  );

  const { data, error, isFetching, isInitialLoading, retry } = useChampionStudents(query);
  const details = useChampionStudentDetails(selectedStudentId, range);

  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Typing stays local and only reaches the URL (and the API) after a pause.
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const lastSyncedSearch = useRef(urlSearch);

  useEffect(() => {
    if (debouncedSearch === lastSyncedSearch.current) {
      return;
    }
    lastSyncedSearch.current = debouncedSearch;
    updateParams({ search: debouncedSearch, page: null });
  }, [debouncedSearch, updateParams]);

  useEffect(() => {
    // Keeps the box in step when the URL changes from elsewhere, e.g. the back button.
    if (urlSearch === lastSyncedSearch.current) {
      return;
    }
    lastSyncedSearch.current = urlSearch;
    setSearchInput(urlSearch);
  }, [urlSearch]);

  const handleRangeChange = useCallback(
    (next: DashboardRange) => updateParams({ range: next, page: null }),
    [updateParams],
  );

  const handleStatusChange = useCallback(
    (next: ActivityStatus) => updateParams({ status: next, page: null }),
    [updateParams],
  );

  const handleSort = useCallback(
    (field: StudentSortField, order: SortOrder) =>
      updateParams({ sortBy: field, sortOrder: order, page: null }),
    [updateParams],
  );

  const handlePageChange = useCallback(
    (next: number) => updateParams({ page: next > 1 ? String(next) : null }),
    [updateParams],
  );

  const handleResetFilters = useCallback(() => {
    lastSyncedSearch.current = '';
    setSearchInput('');
    updateParams({ search: null, status: DEFAULT_STATUS, page: null });
  }, [updateParams]);

  // Focus goes back to the name that opened the drawer once it closes.
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  const handleSelectStudent = useCallback(
    (studentId: string, trigger: HTMLElement) => {
      drawerTriggerRef.current = trigger;
      updateParams({ studentId });
    },
    [updateParams],
  );

  const handleCloseDrawer = useCallback(() => {
    const trigger = drawerTriggerRef.current;
    drawerTriggerRef.current = null;
    updateParams({ studentId: null });

    if (trigger?.isConnected) {
      window.requestAnimationFrame(() => trigger.focus());
    }
  }, [updateParams]);

  const students = data?.students ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const hasSearch = urlSearch.trim().length > 0;
  const hasFilters = hasSearch || status !== DEFAULT_STATUS;
  const isOrganizationEmpty = !hasFilters && totalCount === 0;

  const showFatalError = Boolean(error) && data === null;
  const showStaleDataWarning = Boolean(error) && data !== null;
  const showEmptyState = !isInitialLoading && !showFatalError && students.length === 0;
  const showFooter = !isInitialLoading && !showFatalError;

  const selectedStudentName = students.find(
    (student) => student.id === selectedStudentId,
  )?.fullName;

  return (
    <div className="app-page-container px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <ChampionHeader />

      <div className="mt-6 flex justify-start sm:justify-end">
        <DashboardRangeSelector value={range} onChange={handleRangeChange} />
      </div>

      <section
        aria-label="Students"
        className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      >
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <StudentSearch value={searchInput} onChange={setSearchInput} />
            <StudentActivityFilters value={status} onChange={handleStatusChange} />
          </div>

          <p className="flex items-center gap-2 text-[13px] font-medium text-neutral-500">
            <Info className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
            Click a student name to view details.
          </p>
        </div>

        {showStaleDataWarning ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-maroon-100 bg-maroon-50 px-4 py-3 text-[13px] font-medium text-maroon-800 sm:px-6"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error} Showing the last results that loaded.
            <button
              type="button"
              onClick={retry}
              className="rounded font-semibold underline underline-offset-2 hover:text-maroon-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        ) : null}

        {isInitialLoading ? <StudentTableSkeleton /> : null}

        {showFatalError ? (
          <StudentTableErrorState message={error ?? ''} onRetry={retry} />
        ) : null}

        {showEmptyState ? (
          isOrganizationEmpty ? (
            <StudentTableEmptyState
              title="No students are currently available."
              description="Students appear here as soon as they create an account."
            />
          ) : (
            <StudentTableEmptyState
              title={emptyResultMessage(status, hasSearch)}
              description="Try a different search term, time range, or activity filter."
              onResetFilters={hasFilters ? handleResetFilters : undefined}
            />
          )
        ) : null}

        {!isInitialLoading && !showFatalError && students.length > 0 ? (
          <ChampionStudentTable
            students={students}
            sortBy={sortBy}
            sortOrder={sortOrder}
            selectedStudentId={selectedStudentId}
            isFetching={isFetching}
            onSort={handleSort}
            onSelectStudent={handleSelectStudent}
          />
        ) : null}

        {showFooter ? (
          <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p aria-live="polite" className="text-[13px] font-medium text-neutral-500">
              {formatResultRange(page, DEFAULT_PAGE_SIZE, totalCount)}
            </p>
            <ChampionPagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        ) : null}
      </section>

      <StudentDetailsDrawer
        isOpen={Boolean(selectedStudentId)}
        range={range}
        details={details.data}
        fallbackName={selectedStudentName}
        isLoading={details.isLoading}
        error={details.error}
        onClose={handleCloseDrawer}
        onRetry={details.retry}
      />
    </div>
  );
}
