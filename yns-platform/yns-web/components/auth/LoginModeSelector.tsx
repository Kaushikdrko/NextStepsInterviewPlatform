'use client';

import { GraduationCap, ShieldCheck } from 'lucide-react';

import type { LoginMode } from '@/lib/services/auth';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { mode: 'student', label: 'Student', Icon: GraduationCap },
  { mode: 'champion', label: 'Champion', Icon: ShieldCheck },
] satisfies ReadonlyArray<{ mode: LoginMode; label: string; Icon: typeof GraduationCap }>;

export function LoginModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: LoginMode;
  onChange: (mode: LoginMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Log in as"
      className="grid grid-cols-2 gap-1 rounded-xl bg-[#fff4ef] p-1"
    >
      {OPTIONS.map(({ mode, label, Icon }) => {
        const isSelected = value === mode;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a92712] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
              isSelected
                ? 'bg-white text-[#a92712] shadow-sm'
                : 'text-slate-500 hover:text-[#8f200f]',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
