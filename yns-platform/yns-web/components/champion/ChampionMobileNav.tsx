'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ChampionBrandMark } from '@/components/champion/ChampionBrandMark';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', href: '/champion', match: 'exact' },
  { label: 'Students', href: '/champion/students', match: 'prefix' },
  { label: 'Interviews', href: '/champion/interviews', match: 'prefix' },
  { label: 'Assignments', href: '/champion/assignments', match: 'prefix' },
  { label: 'Meetings', href: '/champion/meetings', match: 'prefix' },
  { label: 'Notes', href: '/champion/notes', match: 'prefix' },
  { label: 'Settings', href: '/champion/settings', match: 'prefix' },
] as const;

export function ChampionMobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center px-4">
        <ChampionBrandMark />
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
        {navItems.map((item) => {
          const isActive =
            item.match === 'exact' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950',
                isActive ? 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white' : '',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
