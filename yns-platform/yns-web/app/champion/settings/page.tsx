import { ShieldCheck, UserCog } from 'lucide-react';

import { ChampionHeader } from '@/components/champion/ChampionHeader';

export default function ChampionSettingsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <ChampionHeader />

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-maroon-700">
                Admin access
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-neutral-900">
                Champion settings
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-neutral-500">
                This dashboard is limited to users with the admin or champion role. Account and role changes are
                currently managed from Supabase.
              </p>
            </div>

            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-maroon-50 text-maroon-700">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
              <UserCog className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">User management</h3>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-neutral-500">
                The production admin flow should let existing admins invite or promote other admins from this page.
                For now, promote users by setting their Supabase app metadata role to admin or champion.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
