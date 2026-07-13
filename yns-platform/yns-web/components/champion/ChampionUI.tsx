import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

// Section container matching the app's rounded white card convention.
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-base font-bold text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-slate-200 bg-white p-6 shadow-sm">
      <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">
      {message}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="text-base font-bold text-slate-950">{title}</p>
      {description ? <p className="max-w-sm text-sm font-semibold text-slate-500">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
