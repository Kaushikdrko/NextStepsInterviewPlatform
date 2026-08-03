'use client';

import { useEffect, useState } from 'react';

import { fetchChampionProfile } from '@/lib/champion/api';
import { isAbortError } from '@/lib/champion/response-cache';
import type { ChampionProfile } from '@/lib/champion/types';

/**
 * The signed-in champion's own name and role, for the header and sidebar.
 * Failing to load it must not break the dashboard, so there is no error state —
 * the account control simply stays in its placeholder form.
 */
export function useChampionProfile(): ChampionProfile | null {
  const [profile, setProfile] = useState<ChampionProfile | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchChampionProfile(controller.signal)
      .then(setProfile)
      .catch((error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) {
          return;
        }
        setProfile(null);
      });

    return () => controller.abort();
  }, []);

  return profile;
}
