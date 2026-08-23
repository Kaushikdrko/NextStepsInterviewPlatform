'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, History, LayoutDashboard, LogOut, Menu, Mic, Settings, Sparkles, User, X } from 'lucide-react';

import { signOut } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';
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
  const [isOpen, setIsOpen] = useState(false);

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

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await signOut(getFirebaseAuth());
    router.replace('/sign-in');
    router.refresh();
  };

  const handleNavClick = (hash?: string) => {
    setActiveHash(hash ?? '');
    setIsOpen(false);
  };

  const sidebarContent = (
    <>
      <Link
        href="/dashboard"
        onClick={() => handleNavClick()}
        className="flex h-16 items-center gap-3 border-b border-[#e8ded8] px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ad2d1f]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#a83223] text-white shadow-sm shadow-[#f8bfa9]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="flex flex-col text-sm font-extrabold leading-[1.08] tracking-tight text-[#8f200f]">
          <span>your</span>
          <span>next steps</span>
        </span>
      </Link>

      <nav aria-label="Student" className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
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
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#7a6a65] transition hover:bg-[#fff4ef] hover:text-[#8f200f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ad2d1f]',
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
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#7a6a65] transition hover:bg-[#fff4ef] hover:text-[#8f200f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ad2d1f]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e8ded8] bg-[#fffdfa]/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" onClick={() => handleNavClick()} className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#a83223] text-white shadow-sm shadow-[#f8bfa9]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col text-sm font-extrabold leading-[1.08] text-[#8f200f]">
            <span>your</span>
            <span>next steps</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="student-mobile-navigation"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#71645e] transition hover:bg-[#fff2ed] hover:text-[#8f200f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ad2d1f]"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Open navigation</span>
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-[#e8ded8] bg-[#fffdfa] lg:flex">
        {sidebarContent}
      </aside>

      {isOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-[#271f1b]/35"
            onClick={() => setIsOpen(false)}
          />
          <aside
            id="student-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Student navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-[#e8ded8] bg-[#fffdfa] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-[#71645e] transition hover:bg-[#fff2ed] hover:text-[#8f200f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ad2d1f]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close navigation</span>
            </button>
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
