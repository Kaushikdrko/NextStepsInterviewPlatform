"use client";

import { useMemo } from "react";
import { CalendarHeart, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { Meeting } from "@/types/champion";
import { STATUS_DOT, formatShortDate, formatTimeRange } from "@/lib/utils/format";

interface UpcomingMeetingsCardProps {
  meetings: Meeting[];
  calendlyUrl: string;
  /** Month to display (defaults to May 2025 to match the mock data). */
  year?: number;
  month?: number; // 0-indexed
  /** Day-of-month to visually mark as "today" / selected. */
  highlightDay?: number;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function UpcomingMeetingsCard({
  meetings,
  calendlyUrl,
  year = 2025,
  month = 4,
  highlightDay = 15,
}: UpcomingMeetingsCardProps) {
  const { cells, meetingDays, monthLabel } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);

    const days = new Set(
      meetings
        .map((m) => new Date(m.startTime))
        .filter((d) => d.getFullYear() === year && d.getMonth() === month)
        .map((d) => d.getDate())
    );

    const label = new Date(year, month, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    return { cells: grid, meetingDays: days, monthLabel: label };
  }, [meetings, year, month]);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-brand">
          <CalendarHeart className="h-4 w-4" />
          Upcoming Meetings
        </h2>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <button
            type="button"
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-20 text-center font-medium">{monthLabel}</span>
          <button
            type="button"
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mini calendar */}
      <div className="p-5">
        <div className="grid grid-cols-7 gap-y-2 text-center">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-[10px] font-semibold text-gray-400">
              {d}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={`empty-${i}`} />;
            const isHighlight = day === highlightDay;
            const hasMeeting = meetingDays.has(day);
            return (
              <div key={day} className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs",
                    isHighlight
                      ? "bg-brand font-semibold text-white"
                      : "text-gray-600"
                  )}
                >
                  {day}
                </span>
                <span
                  className={cn(
                    "mt-0.5 h-1 w-1 rounded-full",
                    hasMeeting && !isHighlight ? "bg-gold" : "bg-transparent"
                  )}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Meeting list */}
      <ul className="divide-y divide-gray-50 border-t border-gray-100">
        {meetings.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-5 py-3">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                STATUS_DOT[m.status]
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {m.studentName}
              </p>
              <p className="text-xs text-gray-500">
                {formatTimeRange(m.startTime, m.endTime)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-600">
                {formatShortDate(m.startTime)}
              </p>
              <p className="text-[11px] text-gray-400">{m.meetingType}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Calendly callout */}
      <div className="mt-auto border-t border-gray-100 p-5">
        <div className="rounded-xl bg-brand-50 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand">
            <CalendarHeart className="h-4 w-4" />
            We use Calendly to make scheduling easy.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Share availability and let students book time.
          </p>
          <a
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block"
          >
            <Button variant="primary" className="w-full">
              Open Calendly
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}
