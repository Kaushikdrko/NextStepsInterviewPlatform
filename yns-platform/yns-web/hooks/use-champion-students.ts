'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { buildStudentQueryString, fetchChampionStudents } from '@/lib/champion/api';
import { ResponseCache, isAbortError } from '@/lib/champion/response-cache';
import type { ChampionStudentListResponse, ChampionStudentQuery } from '@/lib/champion/types';

const LIST_CACHE = new ResponseCache<ChampionStudentListResponse>(30_000);

export const STUDENT_LIST_ERROR = 'Student data could not be loaded.';

interface ChampionStudentsState {
  data: ChampionStudentListResponse | null;
  error: string | null;
  isFetching: boolean;
}

export interface UseChampionStudentsResult extends ChampionStudentsState {
  /** True only before there is anything to show — drives the table skeleton. */
  isInitialLoading: boolean;
  retry: () => void;
}

export function useChampionStudents(query: ChampionStudentQuery): UseChampionStudentsResult {
  const cacheKey = buildStudentQueryString(query);

  const [state, setState] = useState<ChampionStudentsState>({
    data: null,
    error: null,
    isFetching: true,
  });
  const [reloadToken, setReloadToken] = useState(0);

  // The effect reruns on the cache key rather than on the query object, whose
  // identity changes every render.
  const queryRef = useRef(query);
  queryRef.current = query;
  const forceRefetchRef = useRef(false);

  const retry = useCallback(() => {
    forceRefetchRef.current = true;
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    const force = forceRefetchRef.current;
    forceRefetchRef.current = false;

    const cached = force ? null : LIST_CACHE.read(cacheKey);
    if (cached) {
      setState({ data: cached, error: null, isFetching: false });
      return;
    }

    const controller = new AbortController();

    // Previous results stay on screen while the new ones load, so changing a
    // filter dims the table instead of blanking it.
    setState((previous) => ({ data: previous.data, error: null, isFetching: true }));

    fetchChampionStudents(queryRef.current, controller.signal)
      .then((data) => {
        LIST_CACHE.write(cacheKey, data);
        setState({ data, error: null, isFetching: false });
      })
      .catch((error: unknown) => {
        // An aborted request has already been superseded by a newer one.
        if (isAbortError(error) || controller.signal.aborted) {
          return;
        }
        setState((previous) => ({
          data: previous.data,
          error: STUDENT_LIST_ERROR,
          isFetching: false,
        }));
      });

    return () => controller.abort();
  }, [cacheKey, reloadToken]);

  return {
    ...state,
    isInitialLoading: state.isFetching && state.data === null,
    retry,
  };
}
