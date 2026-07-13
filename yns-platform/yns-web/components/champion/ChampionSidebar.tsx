'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  Star,
  Users,
} from 'lucide-react';

import { ChampionBrandMark } from '@/components/champion/ChampionBrandMark';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', href: '/champion', match: 'exact', icon: LayoutDashboard },
  { label: 'Students', href: '/champion/students', match: 'prefix', icon: Users },
  { label: 'Interviews', href: '/champion/interviews', match: 'prefix', icon: Star },
  { label: 'Assignments', href: '/champion/assignments', match: 'prefix', icon: ClipboardList },
  { label: 'Meetings', href: '/champion/meetings', match: 'prefix', icon: CalendarDays },
  { label: 'Notes', href: '/champion/notes', match: 'prefix', icon: MessagesSquare },
  { label: 'Settings', href: '/champion/settings', match: 'prefix', icon: Settings },
] as const;

export function ChampionSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-slate-200 bg-white lg:flex">
      <Link href="/champion" className="flex h-16 items-center border-b border-slate-200 px-5">
        <ChampionBrandMark />
      </Link>

      <nav className="flex-1 space-y-2 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.match === 'exact' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950',
                isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100 hover:bg-indigo-600 hover:text-white' : '',
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Student View
        </Link>
      </div>
    </aside>
  );
}
