import { ChampionMobileNav } from '@/components/champion/ChampionMobileNav';
import { ChampionSidebar } from '@/components/champion/ChampionSidebar';

export const metadata = {
  title: 'Champion Dashboard | Your Next Steps-US',
  description: 'Mentor tools to track student progress, review AI interviews, and support student success.',
};

export default function ChampionLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <ChampionSidebar />
      <ChampionMobileNav />

      <div className="min-h-screen px-4 py-6 sm:px-6 lg:pl-[220px]">
        <div className="mx-auto w-full max-w-6xl space-y-5 lg:px-6">{children}</div>
      </div>
    </main>
  );
}
