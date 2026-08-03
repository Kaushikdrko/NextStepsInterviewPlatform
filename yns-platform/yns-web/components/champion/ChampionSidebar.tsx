'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Menu, Settings, Users, X } from 'lucide-react';

import { ChampionAccountMenu } from '@/components/champion/ChampionAccountMenu';
import { ChampionBrandMark } from '@/components/champion/ChampionBrandMark';
import { useChampionProfileContext } from '@/components/champion/ChampionProfileProvider';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/champion/dashboard', icon: Home },
  { label: 'Students', href: '/champion/students', icon: Users },
  { label: 'Settings', href: '/champion/settings', icon: Settings },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const profile = useChampionProfileContext();

  return (
    <>
      <div className="flex h-[92px] shrink-0 items-center px-5">
        <Link
          href="/champion/dashboard"
          onClick={onNavigate}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
        >
          <ChampionBrandMark />
        </Link>
      </div>

      <nav aria-label="Champion" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2',
                isActive
                  ? 'bg-maroon-50 text-maroon-700'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900',
              )}
            >
              <item.icon
                className={cn('h-[18px] w-[18px]', isActive ? 'text-maroon-700' : 'text-neutral-400')}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-neutral-200 p-3">
        <ChampionAccountMenu profile={profile} placement="up" fullWidth />
      </div>
    </>
  );
}

export function ChampionSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Below lg the sidebar collapses to a bar with a menu button. */}
      <div className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Open navigation</span>
        </button>
        <ChampionBrandMark compact />
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-neutral-200 bg-white lg:flex">
        <SidebarContent />
      </aside>

      {/* Rendered only while open so its links never sit off-screen in the tab order. */}
      {isOpen ? (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-neutral-900/40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Champion navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-neutral-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close navigation</span>
            </button>
            <SidebarContent onNavigate={() => setIsOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
