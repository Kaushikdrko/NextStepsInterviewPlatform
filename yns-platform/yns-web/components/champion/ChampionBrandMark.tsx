import { cn } from '@/lib/utils';

// The official Your Next Steps symbol (compass rose in a focus frame) ships at
// public/yns-symbol.png as a flat single-colour glyph on transparency. It is
// applied here as a CSS mask so it can be painted white on the maroon tile
// without redrawing or re-colouring the artwork itself. Swapping that one file
// updates the mark everywhere it appears.
const SYMBOL_SRC = '/yns-symbol.png';

const maskStyle = {
  maskImage: `url(${SYMBOL_SRC})`,
  WebkitMaskImage: `url(${SYMBOL_SRC})`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
} as const;

export function ChampionBrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-maroon-700">
        <span aria-hidden="true" className="h-7 w-7 bg-white" style={maskStyle} />
      </span>

      {compact ? null : (
        <span
          aria-hidden="true"
          className="flex flex-col text-[13px] font-extrabold uppercase leading-[1.08] tracking-[-0.01em] text-maroon-800"
        >
          <span>Your</span>
          <span>Next</span>
          <span>Steps</span>
        </span>
      )}

      <span className="sr-only">Your Next Steps</span>
    </span>
  );
}
