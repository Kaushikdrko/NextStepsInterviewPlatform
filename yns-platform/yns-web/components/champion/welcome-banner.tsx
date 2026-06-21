"use client";

import { CalendarPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeBannerProps {
  championFirstName?: string;
  onViewStudents?: () => void;
  onScheduleMeeting?: () => void;
}

export function WelcomeBanner({
  onViewStudents,
  onScheduleMeeting,
}: WelcomeBannerProps) {
  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">
          Welcome back, Champion
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Track student progress, review AI interview feedback, and help
          students prepare for their next opportunity.
        </p>
      </div>

      <div className="flex flex-shrink-0 flex-wrap gap-3">
        <Button variant="primary" onClick={onViewStudents}>
          <Users className="h-4 w-4" />
          View Students
        </Button>
        <Button variant="accent" onClick={onScheduleMeeting}>
          <CalendarPlus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>
    </section>
  );
}
