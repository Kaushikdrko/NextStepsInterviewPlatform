'use client';

import { useEffect, useState } from 'react';

import { ChampionPageHeader } from '@/components/champion/ChampionPageHeader';
import { ChampionSettingsForm } from '@/components/champion/ChampionSettingsForm';
import { ErrorState, LoadingState } from '@/components/champion/ChampionUI';
import { getChampionSettings } from '@/lib/champion/service';
import type { ChampionSettings } from '@/lib/champion/types';

export default function ChampionSettingsPage() {
  const [settings, setSettings] = useState<ChampionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const data = await getChampionSettings();
        if (isMounted) setSettings(data);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <ChampionPageHeader
        title="Champion Settings"
        subtitle="Update your profile, scheduling link, and notification preferences."
        breadcrumbs={[{ label: 'Champion', href: '/champion' }, { label: 'Settings' }]}
      />

      {error ? <ErrorState message={error} /> : null}
      {isLoading ? <LoadingState label="Loading settings…" /> : null}
      {!isLoading && settings ? <ChampionSettingsForm initial={settings} /> : null}
    </>
  );
}
