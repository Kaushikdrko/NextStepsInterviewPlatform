"use client";

import {
  CalendarClock,
  FileText,
  GraduationCap,
  Mail,
  MessageSquareText,
  Phone,
  Star,
  Target,
  CalendarDays,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Student } from "@/types/champion";
import {
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  fullName,
  initials,
  formatDate,
} from "@/lib/utils/format";

interface StudentProfileCardProps {
  student: Student;
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="truncate text-sm text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function CircularProgress({ percent }: { percent: number }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#eef0f3"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#16a34a"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <div className="text-sm font-semibold text-gray-900">{children}</div>
      </div>
    </div>
  );
}

export function StudentProfileCard({ student }: StudentProfileCardProps) {
  return (
    <Card>
      {/* Top: identity, contact grid, resume tile */}
      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[auto_1fr_auto]">
        {/* Identity */}
        <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:gap-2">
          <Avatar
            src={student.avatarUrl}
            alt={fullName(student)}
            fallback={initials(student)}
            className="h-20 w-20 ring-4 ring-brand-50"
          />
          <div className="lg:text-center">
            <h2 className="text-lg font-bold text-gray-900">
              {fullName(student)}
            </h2>
            <Badge
              variant={STATUS_BADGE_VARIANT[student.status]}
              className="mt-1"
            >
              {STATUS_LABEL[student.status]}
            </Badge>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:border-x lg:border-gray-100 lg:px-5">
          <ContactRow icon={Mail} label="Email" value={student.email} />
          <ContactRow
            icon={GraduationCap}
            label="College/School"
            value={student.school}
          />
          <ContactRow icon={Phone} label="Phone" value={student.phone} />
          <ContactRow icon={CalendarDays} label="Year" value={student.year} />
          <ContactRow
            icon={Target}
            label="Field Pursuing"
            value={student.fieldPursuing}
          />
          <ContactRow icon={Star} label="GPA" value={student.gpa} />
        </div>

        {/* Resume preview tile */}
        <div className="flex w-full flex-col items-center gap-2 lg:w-36">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Resume
          </p>
          <div className="flex h-28 w-24 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
            <FileText className="h-8 w-8" />
          </div>
          {student.resumeUploaded ? (
            <p className="text-center text-[11px] leading-tight text-status-great">
              Resume Uploaded
              <span className="block text-gray-400">
                Updated {formatDate(student.resumeUpdatedAt)}
              </span>
            </p>
          ) : (
            <p className="text-center text-[11px] text-status-help">
              No resume uploaded
            </p>
          )}
        </div>
      </div>

      {/* Bottom: stats strip */}
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 border-t border-gray-100 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <StatItem icon={MessageSquareText} label="Interviews Taken">
          <span>{student.interviewsTaken}</span>
          <span className="ml-1 text-xs font-normal text-gray-400">
            Last: {formatDate(student.lastInterviewDate)}
          </span>
        </StatItem>
        <StatItem icon={CalendarClock} label="Upcoming Interviews">
          <span>{student.upcomingInterviewsCount}</span>
          <span className="ml-1 text-xs font-normal text-gray-400">
            {formatDate(student.upcomingInterviewDate)}
          </span>
        </StatItem>
        <StatItem icon={Star} label="Latest Score">
          <span>{student.latestScore}%</span>
          <span className="ml-1 text-xs font-normal text-gray-400">
            {formatDate(student.latestScoreDate)}
          </span>
        </StatItem>
        <StatItem icon={MessageSquareText} label="Interview Types">
          <span className="text-xs font-medium text-gray-700">
            {student.interviewTypes.join(", ")}
          </span>
        </StatItem>
        <div className="col-span-2 flex items-center gap-3 px-4 py-3 sm:col-span-1">
          <div className="relative flex items-center justify-center">
            <CircularProgress percent={student.progressPercent} />
            <span className="absolute text-[10px] font-bold text-gray-700">
              {student.progressPercent}%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Progress Status
            </p>
            <p className="text-sm font-semibold text-status-great">
              {student.progressStatus}
            </p>
            <p className="text-[11px] text-gray-400">
              {student.progressPercent}% Complete
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
