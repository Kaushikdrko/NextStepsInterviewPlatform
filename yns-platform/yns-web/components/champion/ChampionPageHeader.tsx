import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Crumb = { label: string; href?: string };

interface ChampionPageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}

export function ChampionPageHeader({ title, subtitle, breadcrumbs, actions }: ChampionPageHeaderProps) {
  return (
    <div className="space-y-3">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="transition hover:text-slate-950">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-slate-950' : undefined}>{crumb.label}</span>
                )}
                {!isLast ? <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
