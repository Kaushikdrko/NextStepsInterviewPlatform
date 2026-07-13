// Shared TypeScript models for the Champion Dashboard.
// These mirror the Pydantic schemas in yns-api/app/api/champion/models.py so the
// mock service can later be swapped for real FastAPI responses with no UI changes.

export type StudentStatus = 'on_track' | 'excellent' | 'watch' | 'needs_help' | 'not_started';

export type GoalType = 'internship' | 'job' | 'college' | 'scholarship';

export type EducationLevel = 'high_school' | 'college' | 'recent_grad';

export type InterviewPurpose = GoalType;

export type QuestionMode = 'behavioral' | 'technical' | 'situational' | 'mixed';

export type ReviewStatus = 'pending' | 'reviewed' | 'needs_follow_up';

export type SkillName =
  | 'Communication'
  | 'Confidence'
  | 'Response Structure'
  | 'Technical Knowledge'
  | 'Problem Solving'
  | 'Leadership'
  | 'Time Management'
  | 'Professionalism';

export type SkillStatus = 'strong' | 'good' | 'needs_practice' | 'needs_help';

export type NoteVisibility = 'student_visible' | 'private';

export type NoteCategory =
  | 'general'
  | 'interview_feedback'
  | 'encouragement'
  | 'practice_assignment'
  | 'follow_up';

export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export type FocusSkill = SkillName;

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type MeetingType = 'interview_prep' | 'scholarship_guidance' | 'career_question' | 'general' | 'mock_interview';

export interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  school: string | null;
  educationLevel: EducationLevel;
  year: string | null;
  fieldPursuing: string | null;
  goalType: GoalType;
  latestScore: number | null;
  readinessScore: number | null;
  lastPracticeDate: string | null;
  completedInterviews: number;
  status: StudentStatus;
}

export interface StudentDetail extends StudentSummary {
  phone: string | null;
  gpa: number | null;
  resumeUploaded: boolean;
  resumeUrl: string | null;
  resumeLastUpdated: string | null;
  assignedChampionName: string;
  averageScore: number | null;
  totalPracticeMinutes: number;
  lastInterviewDate: string | null;
  upcomingMeetingDate: string | null;
  scoreTrend: ScoreTrendPoint[];
  skills: SkillScore[];
}

export interface ScoreTrendPoint {
  date: string;
  score: number;
}

export interface SkillScore {
  skill: SkillName;
  score: number;
  status: SkillStatus;
  recommendation: string;
}

export interface AttentionAlert {
  id: string;
  studentId: string;
  studentName: string;
  reason: string;
  status: StudentStatus;
}

export interface ActivityItem {
  id: string;
  studentId: string;
  studentName: string;
  interviewPurpose: InterviewPurpose;
  questionMode: QuestionMode;
  score: number | null;
  date: string;
  reviewStatus: ReviewStatus;
}

export interface DashboardSummary {
  assignedStudentsCount: number;
  interviewsCompletedCount: number;
  studentsNeedingHelpCount: number;
  overallReadinessScore: number | null;
  pendingReviewsCount: number;
  upcomingMeetingsCount: number;
  assignmentsDueCount: number;
}

export interface InterviewReview {
  id: string;
  studentId: string;
  studentName: string;
  interviewPurpose: InterviewPurpose;
  questionMode: QuestionMode;
  date: string;
  score: number | null;
  status: 'completed' | 'in_progress' | 'abandoned';
  reviewStatus: ReviewStatus;
}

export interface InterviewReviewDetail extends InterviewReview {
  questions: string[];
  transcriptSummary: string;
  feedbackSummary: string;
  scoreBreakdown: { label: string; score: number }[];
  strengths: string[];
  improvementAreas: string[];
  recommendedNextPractice: string;
  championReviewNotes: string | null;
}

export interface ChampionNote {
  id: string;
  studentId: string;
  studentName: string;
  championName: string;
  content: string;
  visibility: NoteVisibility;
  category: NoteCategory;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateNoteInput {
  studentId: string;
  content: string;
  visibility: NoteVisibility;
  category: NoteCategory;
}

export interface PracticeAssignment {
  id: string;
  studentId: string;
  studentName: string;
  interviewPurpose: InterviewPurpose;
  questionMode: QuestionMode;
  focusSkill: FocusSkill;
  resumeBased: boolean;
  dueDate: string | null;
  instructions: string;
  status: AssignmentStatus;
  createdAt: string;
}

export interface CreateAssignmentInput {
  studentId: string;
  interviewPurpose: InterviewPurpose;
  questionMode: QuestionMode;
  focusSkill: FocusSkill;
  resumeBased: boolean;
  dueDate: string | null;
  instructions: string;
}

export interface Meeting {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  meetingType: MeetingType;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  meetingUrl: string | null;
}

export interface ChampionSettings {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string | null;
  title: string;
  organization: string | null;
  expertiseAreas: string[];
  bio: string;
  timezone: string;
  profileImageUrl: string | null;
  calendlyUrl: string | null;
  availabilityNote: string | null;
  notifyCompletedInterviews: boolean;
  notifyStudentNotes: boolean;
  notifyScheduledMeetings: boolean;
  alertStudentsNeedingHelp: boolean;
}
