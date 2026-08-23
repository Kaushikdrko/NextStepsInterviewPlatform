import Link from 'next/link';
import { Play } from 'lucide-react';

type WelcomeSectionProps = {
  userName: string;
  practiceStreakDays: number;
};

export function WelcomeSection({ userName, practiceStreakDays }: WelcomeSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-[#e7dbd0] bg-white px-5 py-4 shadow-[0_2px_5px_rgba(78,45,31,0.05)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-lg font-extrabold tracking-normal text-[#271f1b]">Welcome back, {userName}</h1>
        <p className="mt-1 text-sm font-medium text-[#8a7c75]">
          {practiceStreakDays > 0
            ? `Keep up the momentum - you're ${practiceStreakDays} ${practiceStreakDays === 1 ? 'day' : 'days'} into your practice streak.`
            : 'Start a practice session today and build your interview streak.'}
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col-reverse gap-2 sm:w-auto sm:flex-row">
        <Link
          href="/settings"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e3d4c7] bg-white px-4 text-sm font-bold text-[#71645e] transition hover:bg-[#fbf6f1]"
        >
          Update profile
        </Link>
        <Link
          href="/practice"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#ad2d1f] px-5 text-sm font-extrabold text-white shadow-[0_4px_9px_rgba(173,45,31,0.18)] transition hover:bg-[#942417]"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          Start interview practice
        </Link>
      </div>
    </section>
  );
}
