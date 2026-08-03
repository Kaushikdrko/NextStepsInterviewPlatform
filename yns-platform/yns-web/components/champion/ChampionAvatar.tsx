import { initialsFor } from '@/lib/champion/format';
import { cn } from '@/lib/utils';

export function ChampionAvatar({
  fullName,
  className,
}: {
  fullName: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon-800 text-xs font-bold tracking-wide text-white',
        className,
      )}
    >
      {initialsFor(fullName)}
    </span>
  );
}
