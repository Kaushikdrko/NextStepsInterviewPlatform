'use client';

import { createContext, useContext } from 'react';

import { useChampionProfile } from '@/hooks/use-champion-profile';
import type { ChampionProfile } from '@/lib/champion/types';

// The sidebar and the page header both show the signed-in champion. Loading it
// once here keeps them consistent and costs a single request.
const ChampionProfileContext = createContext<ChampionProfile | null>(null);

export function ChampionProfileProvider({ children }: { children: React.ReactNode }) {
  const profile = useChampionProfile();

  return (
    <ChampionProfileContext.Provider value={profile}>{children}</ChampionProfileContext.Provider>
  );
}

export function useChampionProfileContext(): ChampionProfile | null {
  return useContext(ChampionProfileContext);
}
