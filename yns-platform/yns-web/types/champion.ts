/**
 * Shared TypeScript types for the Champion Dashboard.
 *
 * These mirror the FastAPI/PostgreSQL models so the frontend can switch from
 * mock data to real API responses with minimal changes.
 */

/** Student readiness status. Maps to a colored dot in the UI. */
export type StudentStatus = "great" | "amazing" | "help";

export type InterviewType =
  | "Behavioral"
  | "Situational"
  | "Technical"
  | "Mixed";

export type InterviewStatus = "Completed" | "Scheduled" | "In Progress";

export type ProgressStatus = "On Track" | "Needs Attention" | "At Risk";

export type NoteVisibility = "student" | "private";

export interface Champion {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "champion" | "admin";
  avatarUrl?: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school: string;
  year: string;
  fieldPursuing: string;
  gpa: string;
  resumeUrl?: string;
  resumeUploaded: boolean;
  resumeUpdatedAt?: string;
  assignedChampionId: string;
  status: StudentStatus;
  avatarUrl?: string;
  // Snapshot stats surfaced in the profile card.
  interviewsTaken: number;
  lastInterviewDate?: string;
  upcomingInterviewDate?: string;
  upcomingInterviewsCount: number;
  latestScore: number;
  latestScoreDate?: string;
  interviewTypes: InterviewType[];
  progressStatus: ProgressStatus;
  progressPercent: number;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  studentId: string;
  interviewType: InterviewType;
  questionMode?: string;
  score: number;
  status: InterviewStatus;
  feedbackSummary: string;
  completedAt: string;
}

export interface ProgressPoint {
  date: string;
  score: number;
}

export interface MentorNote {
  id: string;
  studentId: string;
  championId: string;
  note: string;
  visibility: NoteVisibility;
  createdAt: string;
}

export interface Meeting {
  id: string;
  studentId: string;
  studentName: string;
  championId: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingType: "Virtual" | "In Person";
  calendlyUrl?: string;
  status: StudentStatus;
}

export interface MetricTrend {
  value: string;
  direction: "up" | "down" | "neutral";
}

export interface DashboardSummary {
  assignedStudents: number;
  interviewsCompleted: number;
  studentsNeedingHelp: number;
  overallReadinessScore: number;
  trends: {
    assignedStudents: MetricTrend;
    interviewsCompleted: MetricTrend;
    studentsNeedingHelp: MetricTrend;
    overallReadinessScore: MetricTrend;
  };
}

/** Payload sent when a champion saves a note. */
export interface SaveNotePayload {
  studentId: string;
  note: string;
  visibility: NoteVisibility;
}
