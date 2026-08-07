import { Flame } from 'lucide-react';

type PracticeStreakCardProps = {
  days: number;
};

export function PracticeStreakCard({ days }: PracticeStreakCardProps) {
  return (
    <section className="flex items-center gap-4 rounded-[14px] border border-[#e7dbd0] bg-white p-4 shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff2ed] text-[#ad2d1f]">
        <Flame className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-1.5 text-[#271f1b]">
          <span className="text-[28px] font-black leading-none tabular-nums">{days}</span>
          <span className="text-sm font-extrabold text-[#5f514b]">{days === 1 ? 'day' : 'days'}</span>
        </p>
        <p className="mt-1 text-xs font-medium text-[#8a7c75]">Practice streak</p>
      </div>
    </section>
  );
}
