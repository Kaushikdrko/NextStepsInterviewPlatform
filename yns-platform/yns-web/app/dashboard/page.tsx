"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  CircleAlert,
  Star,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/champion/dashboard-header";
import { WelcomeBanner } from "@/components/champion/welcome-banner";
import { MetricCard } from "@/components/champion/metric-card";
import { StudentSelector } from "@/components/champion/student-selector";
import { StudentProfileCard } from "@/components/champion/student-profile-card";
import { ProgressChart } from "@/components/champion/progress-chart";
import { RecentInterviewTable } from "@/components/champion/recent-interview-table";
import { NotesPanel } from "@/components/champion/notes-panel";
import { UpcomingMeetingsCard } from "@/components/champion/upcoming-meetings-card";
import { Card } from "@/components/ui/card";
import {
  getCurrentChampion,
  getDashboardSummary,
  getMeetings,
  getStudentInterviews,
  getStudentProgress,
  getStudents,
} from "@/lib/api/champion";
import { CALENDLY_URL } from "@/lib/mock/champion-dashboard";
import type {
  Champion,
  DashboardSummary,
  InterviewSession,
  Meeting,
  ProgressPoint,
  Student,
} from "@/types/champion";

export default function ChampionDashboardPage() {
  const [champion, setChampion] = useState<Champion | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load top-level dashboard data once.
  useEffect(() => {
    let active = true;
    (async () => {
      const [championData, summaryData, studentsData, meetingsData] =
        await Promise.all([
          getCurrentChampion(),
          getDashboardSummary(),
          getStudents(),
          getMeetings(),
        ]);
      if (!active) return;
      setChampion(championData);
      setSummary(summaryData);
      setStudents(studentsData);
      setMeetings(meetingsData);
      setSelectedId((prev) => prev ?? studentsData[0]?.id ?? null);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load the selected student's interviews + progress whenever it changes.
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setDetailLoading(true);
    (async () => {
      const [interviewsData, progressData] = await Promise.all([
        getStudentInterviews(selectedId),
        getStudentProgress(selectedId),
      ]);
      if (!active) return;
      setInterviews(interviewsData);
      setProgress(progressData);
      setDetailLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedId) ?? null,
    [students, selectedId]
  );

  const metrics = summary
    ? [
        {
          title: "Assigned Students",
          value: summary.assignedStudents,
          icon: Users,
          trend: summary.trends.assignedStudents,
        },
        {
          title: "Interviews Completed",
          value: summary.interviewsCompleted,
          icon: ClipboardList,
          trend: summary.trends.interviewsCompleted,
        },
        {
          title: "Students Needing Help",
          value: summary.studentsNeedingHelp,
          icon: CircleAlert,
          trend: summary.trends.studentsNeedingHelp,
        },
        {
          title: "Overall Readiness Score",
          value: `${summary.overallReadinessScore}%`,
          icon: Star,
          trend: summary.trends.overallReadinessScore,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50/60">
      {champion && <DashboardHeader champion={champion} />}

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <WelcomeBanner />

        {/* Summary metric cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard
              key={m.title}
              title={m.title}
              value={m.value}
              icon={m.icon}
              trend={m.trend}
            />
          ))}
        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: student selector */}
          <div className="lg:col-span-3">
            <StudentSelector
              students={students}
              selectedStudentId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          {/* Center: profile, chart, sessions, notes */}
          <div className="space-y-6 lg:col-span-6">
            {selectedStudent ? (
              <>
                <StudentProfileCard student={selectedStudent} />
                <ProgressChart data={progress} />
                <RecentInterviewTable interviews={interviews} />
                <NotesPanel studentId={selectedStudent.id} />
              </>
            ) : (
              <Card className="p-10 text-center text-sm text-gray-400">
                Select a student to view their details.
              </Card>
            )}
            {detailLoading && (
              <p className="sr-only" role="status">
                Loading student details
              </p>
            )}
          </div>

          {/* Right: upcoming meetings */}
          <div className="lg:col-span-3">
            <UpcomingMeetingsCard
              meetings={meetings}
              calendlyUrl={CALENDLY_URL}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
