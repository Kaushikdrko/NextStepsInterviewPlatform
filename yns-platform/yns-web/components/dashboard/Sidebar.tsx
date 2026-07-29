'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, History, LayoutDashboard, LogOut, Mic, Settings, Sparkles, User } from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', activePath: '/dashboard', icon: LayoutDashboard },
  { label: 'Practice', href: '/practice', activePath: '/practice', icon: Mic },
  { label: 'History', href: '/history', activePath: '/history', icon: History },
  { label: 'Profile', href: '/profile', activePath: '/profile', icon: User },
  { label: 'Resume', href: '/profile#resume', activePath: '/profile', hash: 'resume', icon: FileText },
  { label: 'Settings', href: '/settings', activePath: '/settings', icon: Settings },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState('');

  useEffect(() => {
    const syncHash = () => {
      setActiveHash(window.location.hash.replace('#', ''));
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);

    return () => {
      window.removeEventListener('hashchange', syncHash);
    };
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/sign-in');
    router.refresh();
  };

  const handleNavClick = (hash?: string) => {
    setActiveHash(hash ?? '');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-[#e8ded8] bg-[#fffdfa] lg:flex">
      <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-[#e8ded8] px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#a83223] text-white shadow-sm shadow-[#f8bfa9]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="flex flex-col text-sm font-extrabold leading-[1.08] tracking-tight text-[#8f200f]">
          <span>your</span>
          <span>next steps</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-2 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.hash === 'resume'
              ? pathname === item.activePath && activeHash === 'resume'
              : (pathname === item.activePath || pathname.startsWith(`${item.activePath}/`)) &&
                !(item.activePath === '/profile' && activeHash === 'resume');

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => handleNavClick(item.hash)}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#7a6a65] transition hover:bg-[#fff4ef] hover:text-[#8f200f]',
                isActive ? 'bg-[#a83223] text-white shadow-sm shadow-[#f8bfa9] hover:bg-[#a83223] hover:text-white' : '',
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#e8ded8] p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#7a6a65] transition hover:bg-[#fff4ef] hover:text-[#8f200f]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </button>
      </div>
    </aside>
  );
}
