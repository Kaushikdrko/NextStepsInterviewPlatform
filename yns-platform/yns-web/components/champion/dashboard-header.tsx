"use client";

import {
  Bell,
  BookOpen,
  ChevronDown,
  Home,
  LayoutDashboard,
  MessageSquare,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import type { Champion } from "@/types/champion";
import { fullName, initials } from "@/lib/utils/format";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  hasDropdown?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: Home },
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Students", icon: Users },
  { label: "Interviews", icon: MessageSquare },
  { label: "Resources", icon: BookOpen, hasDropdown: true },
];

interface DashboardHeaderProps {
  champion: Champion;
  notificationCount?: number;
}

export function DashboardHeader({
  champion,
  notificationCount = 3,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo + organization */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-gold">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="currentColor"
                d="m12 2 2.39 4.84 5.34.78-3.86 3.77.91 5.32L12 14.98l-4.78 2.51.91-5.32L4.27 8.4l5.34-.78L12 2Z"
              />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-brand">
              Your Next Steps-US
            </p>
            <p className="hidden text-[10px] font-medium uppercase tracking-wide text-gold-600 sm:block">
              Empowering Students. Building Futures.
            </p>
          </div>
        </div>

        {/* Primary navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href="#"
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  item.active
                    ? "text-brand"
                    : "text-gray-600 hover:text-brand"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.hasDropdown && <ChevronDown className="h-3.5 w-3.5" />}
                {item.active && (
                  <span className="absolute -bottom-[17px] left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Notifications + champion profile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand"
            aria-label={`Notifications (${notificationCount} unread)`}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <Avatar
              src={champion.avatarUrl}
              alt={fullName(champion)}
              fallback={initials(champion)}
              className="h-9 w-9 ring-2 ring-brand-50"
            />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold text-gray-900">Champion</p>
              <p className="text-xs text-gray-500">{fullName(champion)}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
