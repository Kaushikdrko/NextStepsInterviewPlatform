'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchChampionStudentDetails } from '@/lib/champion/api';
import { ResponseCache, isAbortError } from '@/lib/champion/response-cache';
import type { ChampionStudentDetails, DashboardRange } from '@/lib/champion/types';

const DETAILS_CACHE = new ResponseCache<ChampionStudentDetails>(15_000, 20);

export const STUDENT_DETAILS_ERROR = 'Student details could not be loaded.';

interface ChampionStudentDetailsState {
  data: ChampionStudentDetails | null;
  error: string | null;
  isLoading: boolean;
}

export interface UseChampionStudentDetailsResult extends ChampionStudentDetailsState {
  retry: () => void;
}

/**
 * Loads one student's details. Passing a null id fetches nothing at all — the
 * drawer must not cost a request until a champion actually clicks a name.
 */
export function useChampionStudentDetails(
  studentId: string | null,
  range: DashboardRange,
): UseChampionStudentDetailsResult {
  const [state, setState] = useState<ChampionStudentDetailsState>({
    data: null,
    error: null,
    isLoading: false,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const forceRefetchRef = useRef(false);

  const retry = useCallback(() => {
    forceRefetchRef.current = true;
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!studentId) {
      setState({ data: null, error: null, isLoading: false });
      return;
    }

    const cacheKey = `${studentId}:${range}`;
    const force = forceRefetchRef.current;
    forceRefetchRef.current = false;

    const cached = force ? null : DETAILS_CACHE.read(cacheKey);
    if (cached) {
      setState({ data: cached, error: null, isLoading: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, isLoading: true });

    fetchChampionStudentDetails(studentId, range, controller.signal)
      .then((data) => {
        DETAILS_CACHE.write(cacheKey, data);
        setState({ data, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) {
          return;
        }
        setState({ data: null, error: STUDENT_DETAILS_ERROR, isLoading: false });
      });

    return () => controller.abort();
  }, [studentId, range, reloadToken]);

  return { ...state, retry };
}
