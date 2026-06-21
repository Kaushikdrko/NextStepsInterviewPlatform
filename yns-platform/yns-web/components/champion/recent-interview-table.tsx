"use client";

import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { InterviewSession } from "@/types/champion";
import { formatDate } from "@/lib/utils/format";

interface RecentInterviewTableProps {
  interviews: InterviewSession[];
  onViewAll?: () => void;
}

export function RecentInterviewTable({
  interviews,
  onViewAll,
}: RecentInterviewTableProps) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <h2 className="text-sm font-bold text-brand">Recent Interview Sessions</h2>
      </div>

      {/* Table for md+ screens */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Interview Type</th>
              <th className="px-3 py-3 font-medium">Score</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Feedback Summary</th>
              <th className="px-3 py-3 font-medium" aria-label="Action" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {interviews.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                  {formatDate(it.completedAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-800">
                  {it.interviewType}
                </td>
                <td className="px-3 py-3 font-semibold text-gray-900">
                  {it.score}%
                </td>
                <td className="px-3 py-3">
                  <Badge variant="success">{it.status}</Badge>
                </td>
                <td className="max-w-xs px-3 py-3 text-gray-500">
                  {it.feedbackSummary}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    className="text-gray-400 transition-colors hover:text-brand"
                    aria-label="View interview details"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card list for small screens */}
      <ul className="divide-y divide-gray-50 md:hidden">
        {interviews.map((it) => (
          <li key={it.id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                {it.interviewType}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {it.score}%
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span>{formatDate(it.completedAt)}</span>
              <Badge variant="success">{it.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-gray-500">{it.feedbackSummary}</p>
          </li>
        ))}
      </ul>

      <div className="border-t border-gray-100 p-3 text-center">
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-700"
        >
          View All Interviews
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
