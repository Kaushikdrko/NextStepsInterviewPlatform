'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  MessagesSquare,
  Star,
  TrendingUp,
} from 'lucide-react';

import { ChampionPageHeader } from '@/components/champion/ChampionPageHeader';
import { EmptyState, ErrorState, LoadingState, SectionCard } from '@/components/champion/ChampionUI';
import { NotesList } from '@/components/champion/NotesList';
import { ProgressChart } from '@/components/champion/ProgressChart';
import { SkillsBreakdown } from '@/components/champion/SkillsBreakdown';
import { StudentProfileSummary } from '@/components/champion/StudentProfileSummary';
import { ReviewStatusBadge } from '@/components/champion/StatusBadges';
import {
  formatDate,
  formatScore,
  GOAL_TYPE_LABELS,
  QUESTION_MODE_LABELS,
} from '@/lib/champion/helpers';
import { getInterviewReviews, getStudentDetail, getStudentNotes } from '@/lib/champion/service';
import type { ChampionNote, InterviewReview, StudentDetail } from '@/lib/champion/types';

function StatTile({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-2 text-lg font-extrabold text-slate-950">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

const actionButton =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100';

export default function StudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [notes, setNotes] = useState<ChampionNote[]>([]);
  const [interviews, setInterviews] = useState<InterviewReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const [studentData, notesData, interviewData] = await Promise.all([
          getStudentDetail(studentId),
          getStudentNotes(studentId),
          getInterviewReviews(),
        ]);
        if (!isMounted) return;
        setStudent(studentData);
        setNotes(notesData);
        setInterviews(interviewData.filter((interview) => interview.studentId === studentId));
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load this student.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const studentName = student ? `${student.firstName} ${student.lastName}` : 'Student';

  return (
    <>
      <ChampionPageHeader
        title={studentName}
        subtitle="A full view of this student's profile, readiness, skills, interviews, and notes."
        breadcrumbs={[
          { label: 'Champion', href: '/champion' },
          { label: 'Students', href: '/champion/students' },
          { label: studentName },
        ]}
      />

      {error ? <ErrorState message={error} /> : null}
      {isLoading ? <LoadingState label="Loading student profile…" /> : null}

      {!isLoading && !student && !error ? (
        <EmptyState
          icon={FileText}
          title="Student not found"
          description="This student may not be assigned to you."
          action={
            <Link href="/champion/students" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              Back to students
            </Link>
          }
        />
      ) : null}

      {!isLoading && student ? (
        <>
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Link href="/champion/notes" className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">
              <MessagesSquare className="h-4 w-4" aria-hidden="true" />
              Add Note
            </Link>
            <Link href="/champion/assignments" className={actionButton}>
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Assign Practice
            </Link>
            <Link href="/champion/interviews" className={actionButton}>
              <Star className="h-4 w-4" aria-hidden="true" />
              Review Interviews
            </Link>
            <Link href="/champion/meetings" className={actionButton}>
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Schedule Meeting
            </Link>
            {student.resumeUrl ? (
              <a href={student.resumeUrl} className={actionButton}>
                <FileText className="h-4 w-4" aria-hidden="true" />
                View Resume
              </a>
            ) : null}
          </div>

          <StudentProfileSummary student={student} />

          <SectionCard title="Readiness & Progress">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatTile icon={TrendingUp} label="Readiness" value={formatScore(student.readinessScore)} />
              <StatTile icon={Star} label="Avg. Score" value={formatScore(student.averageScore)} />
              <StatTile icon={ClipboardList} label="Interviews" value={String(student.completedInterviews)} />
              <StatTile icon={Clock} label="Practice Time" value={`${student.totalPracticeMinutes}m`} />
              <StatTile icon={CalendarDays} label="Last Interview" value={formatDate(student.lastInterviewDate)} />
              <StatTile icon={CalendarDays} label="Next Meeting" value={formatDate(student.upcomingMeetingDate)} />
            </div>
            <div className="mt-5">
              <ProgressChart data={student.scoreTrend} />
            </div>
          </SectionCard>

          <SectionCard title="Skills Breakdown" description="Proficiency and recommendations by skill.">
            <SkillsBreakdown skills={student.skills} />
          </SectionCard>

          <SectionCard
            title="Recent Interviews"
            description="This student's most recent AI interview sessions."
            action={
              <Link href="/champion/interviews" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                All interviews
              </Link>
            }
          >
            {interviews.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">No interviews recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-950">
                        {GOAL_TYPE_LABELS[interview.interviewPurpose]} · {QUESTION_MODE_LABELS[interview.questionMode]}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">{formatDate(interview.date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-slate-950">{formatScore(interview.score)}</span>
                      <ReviewStatusBadge status={interview.reviewStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Notes Preview"
            description="Student-visible and private mentor notes are clearly labeled."
            action={
              <Link href="/champion/notes" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                Manage notes
              </Link>
            }
          >
            <NotesList notes={notes} />
          </SectionCard>
        </>
      ) : null}
    </>
  );
}
