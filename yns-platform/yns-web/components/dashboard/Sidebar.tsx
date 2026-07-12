'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrainCircuit, FileText, History, LayoutDashboard, LogOut, Mic, Settings, User } from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', activePath: '/dashboard', icon: LayoutDashboard },
  { label: 'Practice', href: '/practice', activePath: '/practice', icon: Mic },
  { label: 'History', href: '/history', activePath: '/history', icon: History },
  { label: 'Profile', href: '/profile', activePath: '/profile', icon: User },
  { label: 'Resume', href: '/profile', activePath: '/profile', icon: FileText },
  { label: 'Settings', href: '/dashboard', activePath: '/settings', icon: Settings },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/sign-in');
    router.refresh();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-slate-200 bg-white lg:flex">
      <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
          <BrainCircuit className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-sm font-bold text-slate-950">InterviewPrep AI</span>
      </Link>

      <nav className="flex-1 space-y-2 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.activePath || pathname.startsWith(`${item.activePath}/`);

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
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </button>
      </div>
    </aside>
  );
}
