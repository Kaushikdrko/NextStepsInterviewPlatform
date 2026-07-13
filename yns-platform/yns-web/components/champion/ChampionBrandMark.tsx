import Image from 'next/image';

// Your Next Steps-US brand mark. Uses the official organization symbol
// (compass rose in a focus frame) served from /public/yns-symbol.png.
export function ChampionBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <Image
          src="/yns-symbol.png"
          alt="Your Next Steps-US"
          width={28}
          height={28}
          className="h-7 w-7"
          priority
        />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-extrabold text-slate-950">Your Next Steps-US</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">Champion Dashboard</span>
        </span>
      ) : null}
    </span>
  );
}
