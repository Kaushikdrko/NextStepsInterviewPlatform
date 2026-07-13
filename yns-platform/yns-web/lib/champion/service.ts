// Champion Dashboard data service.
//
// Every function is async and returns typed data, mirroring the FastAPI
// endpoints under /api/champion. Today they resolve from local mock data so the
// dashboard renders without a running backend. To go live, replace each body
// with an `apiFetch('/api/champion/...')` call (see lib/utils/api-client.ts).
// The function signatures are designed so the UI does not need to change.

import {
  mockAssignments,
  mockChampionSettings,
  mockInterviewReviews,
  mockMeetings,
  mockNotes,
  mockStudents,
} from './mock-data';
import type {
  ActivityItem,
  AttentionAlert,
  ChampionNote,
  ChampionSettings,
  CreateAssignmentInput,
  CreateNoteInput,
  DashboardSummary,
  InterviewReview,
  InterviewReviewDetail,
  Meeting,
  PracticeAssignment,
  ReviewStatus,
  StudentDetail,
  StudentSummary,
} from './types';

// Simulated latency keeps loading states realistic during development.
const LATENCY_MS = 250;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function toSummary(student: StudentDetail): StudentSummary {
  const {
    id,
    firstName,
    lastName,
    email,
    school,
    educationLevel,
    year,
    fieldPursuing,
    goalType,
    latestScore,
    readinessScore,
    lastPracticeDate,
    completedInterviews,
    status,
  } = student;

  return {
    id,
    firstName,
    lastName,
    email,
    school,
    educationLevel,
    year,
    fieldPursuing,
    goalType,
    latestScore,
    readinessScore,
    lastPracticeDate,
    completedInterviews,
    status,
  };
}

function daysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const readinessScores = mockStudents
    .map((student) => student.readinessScore)
    .filter((score): score is number => typeof score === 'number');

  const overallReadinessScore =
    readinessScores.length > 0
      ? Math.round(readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length)
      : null;

  const pendingReviewsCount = mockInterviewReviews.filter(
    (review) => review.reviewStatus !== 'reviewed',
  ).length;

  const now = new Date();
  const upcomingMeetingsCount = mockMeetings.filter(
    (meeting) => meeting.status === 'scheduled' && new Date(meeting.startTime) >= now,
  ).length;

  const assignmentsDueCount = mockAssignments.filter(
    (assignment) => assignment.status === 'assigned' || assignment.status === 'in_progress' || assignment.status === 'overdue',
  ).length;

  return delay({
    assignedStudentsCount: mockStudents.length,
    interviewsCompletedCount: mockStudents.reduce((total, student) => total + student.completedInterviews, 0),
    studentsNeedingHelpCount: mockStudents.filter((student) => student.status === 'needs_help').length,
    overallReadinessScore,
    pendingReviewsCount,
    upcomingMeetingsCount,
    assignmentsDueCount,
  });
}

export async function getAttentionAlerts(): Promise<AttentionAlert[]> {
  const alerts: AttentionAlert[] = [];

  for (const student of mockStudents) {
    const name = `${student.firstName} ${student.lastName}`;

    if (student.status === 'needs_help') {
      alerts.push({
        id: `alert-help-${student.id}`,
        studentId: student.id,
        studentName: name,
        reason: 'Low average score — needs a 1:1 check-in',
        status: 'needs_help',
      });
      continue;
    }

    if (student.status === 'not_started') {
      alerts.push({
        id: `alert-start-${student.id}`,
        studentId: student.id,
        studentName: name,
        reason: 'Has not started any practice interviews yet',
        status: 'not_started',
      });
      continue;
    }

    const inactiveDays = daysSince(student.lastPracticeDate);
    if (inactiveDays !== null && inactiveDays >= 14) {
      alerts.push({
        id: `alert-inactive-${student.id}`,
        studentId: student.id,
        studentName: name,
        reason: `No practice in ${inactiveDays} days`,
        status: 'watch',
      });
    }
  }

  // Pending review alerts.
  for (const review of mockInterviewReviews) {
    if (review.reviewStatus === 'pending') {
      alerts.push({
        id: `alert-review-${review.id}`,
        studentId: review.studentId,
        studentName: review.studentName,
        reason: 'Interview is awaiting your review',
        status: 'watch',
      });
    }
  }

  return delay(alerts);
}

export async function getRecentActivity(limit = 6): Promise<ActivityItem[]> {
  const activity: ActivityItem[] = mockInterviewReviews
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
    .map((review) => ({
      id: review.id,
      studentId: review.studentId,
      studentName: review.studentName,
      interviewPurpose: review.interviewPurpose,
      questionMode: review.questionMode,
      score: review.score,
      date: review.date,
      reviewStatus: review.reviewStatus,
    }));

  return delay(activity);
}

export async function getAssignedStudents(): Promise<StudentSummary[]> {
  return delay(mockStudents.map(toSummary));
}

export async function getStudentDetail(studentId: string): Promise<StudentDetail | null> {
  const student = mockStudents.find((candidate) => candidate.id === studentId) ?? null;
  return delay(student);
}

export async function getInterviewReviews(): Promise<InterviewReview[]> {
  const reviews: InterviewReview[] = mockInterviewReviews.map((review) => ({
    id: review.id,
    studentId: review.studentId,
    studentName: review.studentName,
    interviewPurpose: review.interviewPurpose,
    questionMode: review.questionMode,
    date: review.date,
    score: review.score,
    status: review.status,
    reviewStatus: review.reviewStatus,
  }));

  return delay(reviews);
}

export async function getInterviewReviewDetail(interviewId: string): Promise<InterviewReviewDetail | null> {
  const detail = mockInterviewReviews.find((review) => review.id === interviewId) ?? null;
  return delay(detail);
}

export async function updateInterviewReview(
  interviewId: string,
  reviewStatus: ReviewStatus,
  championReviewNotes?: string,
): Promise<InterviewReviewDetail | null> {
  const detail = mockInterviewReviews.find((review) => review.id === interviewId);
  if (!detail) return delay(null);

  detail.reviewStatus = reviewStatus;
  if (typeof championReviewNotes === 'string') {
    detail.championReviewNotes = championReviewNotes;
  }
  return delay({ ...detail });
}

export async function getNotes(): Promise<ChampionNote[]> {
  return delay(
    mockNotes.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );
}

export async function getStudentNotes(studentId: string): Promise<ChampionNote[]> {
  return delay(mockNotes.filter((note) => note.studentId === studentId));
}

export async function createNote(input: CreateNoteInput): Promise<ChampionNote> {
  const student = mockStudents.find((candidate) => candidate.id === input.studentId);
  const note: ChampionNote = {
    id: `note-${Date.now()}`,
    studentId: input.studentId,
    studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown student',
    championName: mockChampionSettings.displayName,
    content: input.content,
    visibility: input.visibility,
    category: input.category,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
  mockNotes.unshift(note);
  return delay(note);
}

export async function getAssignments(): Promise<PracticeAssignment[]> {
  return delay(
    mockAssignments.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );
}

export async function createAssignment(input: CreateAssignmentInput): Promise<PracticeAssignment> {
  const student = mockStudents.find((candidate) => candidate.id === input.studentId);
  const assignment: PracticeAssignment = {
    id: `asg-${Date.now()}`,
    studentId: input.studentId,
    studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown student',
    interviewPurpose: input.interviewPurpose,
    questionMode: input.questionMode,
    focusSkill: input.focusSkill,
    resumeBased: input.resumeBased,
    dueDate: input.dueDate,
    instructions: input.instructions,
    status: 'assigned',
    createdAt: new Date().toISOString(),
  };
  mockAssignments.unshift(assignment);
  return delay(assignment);
}

export async function getMeetings(): Promise<Meeting[]> {
  return delay(
    mockMeetings.slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  );
}

export async function getChampionSettings(): Promise<ChampionSettings> {
  return delay({ ...mockChampionSettings });
}

export async function updateChampionSettings(update: ChampionSettings): Promise<ChampionSettings> {
  Object.assign(mockChampionSettings, update);
  return delay({ ...mockChampionSettings });
}
