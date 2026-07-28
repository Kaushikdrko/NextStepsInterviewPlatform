'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, LogOut, Settings } from 'lucide-react';

import { ChampionAvatar } from '@/components/champion/ChampionAvatar';
import type { ChampionProfile } from '@/lib/champion/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const PLACEHOLDER_NAME = 'Champion';

export function ChampionAccountMenu({
  profile,
  placement = 'down',
  fullWidth = false,
  className,
}: {
  profile: ChampionProfile | null;
  placement?: 'up' | 'down';
  fullWidth?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const fullName = profile?.fullName ?? PLACEHOLDER_NAME;
  const roleLabel = profile?.roleLabel ?? 'Champion';

  const close = useCallback((returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    firstItemRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    }

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        close(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isOpen, close]);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/sign-in');
    router.refresh();
  }

  const Chevron = placement === 'up' ? ChevronUp : ChevronDown;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={cn(
          'flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2',
          fullWidth && 'w-full',
        )}
      >
        <ChampionAvatar fullName={fullName} className="order-2" />
        <span className="order-1 flex min-w-0 flex-col text-right leading-tight">
          <span className="truncate text-sm font-semibold text-neutral-900">{fullName}</span>
          <span className="truncate text-xs font-medium text-neutral-500">{roleLabel}</span>
        </span>
        <Chevron className="order-3 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
        <span className="sr-only">Open account menu</span>
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className={cn(
            'absolute right-0 z-50 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg',
            placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {profile?.email ? (
            <p className="truncate border-b border-neutral-100 px-3 py-2 text-xs font-medium text-neutral-500">
              {profile.email}
            </p>
          ) : null}

          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              close(false);
              router.push('/settings');
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
          >
            <Settings className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            Account settings
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-maroon-700 hover:bg-maroon-50 focus-visible:bg-maroon-50 focus-visible:outline-none disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
