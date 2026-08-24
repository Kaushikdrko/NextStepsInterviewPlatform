import { ChampionAccessGuard } from '@/components/champion/ChampionAccessGuard';
import { ChampionProfileProvider } from '@/components/champion/ChampionProfileProvider';
import { ChampionSidebar } from '@/components/champion/ChampionSidebar';

export default function ChampionLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChampionAccessGuard>
      <ChampionProfileProvider>
        <div className="min-h-screen bg-white font-sans text-neutral-900">
          <ChampionSidebar />
          <div className="lg:pl-[248px]">{children}</div>
        </div>
      </ChampionProfileProvider>
    </ChampionAccessGuard>
  );
}
