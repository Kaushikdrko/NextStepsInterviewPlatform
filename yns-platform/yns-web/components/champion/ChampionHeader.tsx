'use client';

import { ChampionAccountMenu } from '@/components/champion/ChampionAccountMenu';
import { useChampionProfileContext } from '@/components/champion/ChampionProfileProvider';

export function ChampionHeader() {
  const profile = useChampionProfileContext();

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-neutral-900 sm:text-[33px]">
          Champion Dashboard
        </h1>
        <p className="mt-1.5 text-[15px] font-medium text-neutral-500">
          Organization-wide student engagement
        </p>
      </div>

      <div className="shrink-0 sm:-mr-2">
        <ChampionAccountMenu profile={profile} />
      </div>
    </header>
  );
}
