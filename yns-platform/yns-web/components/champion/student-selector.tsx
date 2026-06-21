"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { Student, StudentStatus } from "@/types/champion";
import { STATUS_DOT, STATUS_LABEL, fullName } from "@/lib/utils/format";

interface StudentSelectorProps {
  students: Student[];
  selectedStudentId: string | null;
  onSelect: (studentId: string) => void;
}

const LEGEND: StudentStatus[] = ["great", "amazing", "help"];

export function StudentSelector({
  students,
  selectedStudentId,
  onSelect,
}: StudentSelectorProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => fullName(s).toLowerCase().includes(q));
  }, [students, query]);

  return (
    <Card className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-4">
        <h2 className="mb-3 text-sm font-bold text-brand">Select a Student</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students"
            className="pl-9"
            aria-label="Search students"
          />
        </div>
      </div>

      <ul className="scrollbar-thin max-h-[420px] flex-1 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-gray-400">
            No students found.
          </li>
        )}
        {filtered.map((student) => {
          const selected = student.id === selectedStudentId;
          return (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => onSelect(student.id)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  selected
                    ? "bg-brand-50 font-semibold text-brand"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    STATUS_DOT[student.status]
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{fullName(student)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 p-4">
        {LEGEND.map((status) => (
          <span
            key={status}
            className="flex items-center gap-1.5 text-xs text-gray-500"
          >
            <span
              className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[status])}
              aria-hidden="true"
            />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>
    </Card>
  );
}
