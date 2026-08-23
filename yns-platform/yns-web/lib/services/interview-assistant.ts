import { getFirebaseIdToken } from '@/lib/firebase/client';
import { API_BASE_URL } from '@/lib/utils/api-client';

export type AssistantSessionType = 'behavioral' | 'technical' | 'mixed' | 'resume' | 'job_posting';

export type PlannedQuestion = {
  id: string;
  category: 'behavioral' | 'technical' | 'values';
  difficulty: 'warmup' | 'core' | 'stretch';
  text: string;
  intent: string;
  rubric_focus: string[];
};

export type SessionPlan = {
  session_type: AssistantSessionType;
  questions: PlannedQuestion[];
  target_minutes: number;
};

export type EvaluationDimension = {
  name: string;
  score: number;
  rationale: string;
  quote?: string | null;
};

export type TurnEvaluation = {
  dimensions: EvaluationDimension[];
  overall: number;
  notable_strengths: string[];
  notable_gaps: string[];
};

export type CreateAssistantSessionResponse = {
  session_id: string;
  session_plan: SessionPlan;
};

export type SubmitAssistantTurnResponse = {
  response_text: string;
  action: string;
  next_question: PlannedQuestion | null;
  evaluation: TurnEvaluation | null;
  session_complete: boolean;
};

export type CategoryScore = {
  category: 'behavioral' | 'technical' | 'values';
  score: number;
  notes: string;
};

export type SessionReport = {
  overall: number;
  category_breakdown: CategoryScore[];
  strengths: string[];
  growth_areas: string[];
  recommended_next_steps: string[];
};

export type GenerateReportResponse = {
  report: SessionReport;
};

export type SessionSummary = {
  session_id: string;
  session_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  question_count: number;
  answered_count: number;
  average_rating: number | null;
  duration_minutes: number | null;
};

export type SessionListResponse = {
  sessions: SessionSummary[];
};

export type DashboardStatsResponse = {
  interviews_completed: number;
  questions_answered: number;
  average_feedback_score: number | null;
  practice_streak_days: number;
};

export type WeeklyProgressItem = {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  questions: number;
};

export type WeeklyProgressResponse = {
  items: WeeklyProgressItem[];
};

export type WeeklyGoalResponse = {
  target_sessions: number;
  completed_sessions: number;
  percent_complete: number;
  week_start: string;
  week_end: string;
};

export type FocusAreaResponse = {
  focus_area: string | null;
  detail: string;
  supporting_category: string | null;
  average_recent_score: number | null;
  report_count: number;
};

export type SessionTurnDetail = {
  turn_index: number;
  question: PlannedQuestion;
  answer_text: string;
  evaluation: TurnEvaluation | null;
};

export type SessionDetailResponse = {
  session_id: string;
  session_type: string;
  status: string;
  started_at: string;
  created_at: string;
  completed_at: string | null;
  turns: SessionTurnDetail[];
};

export type InterviewFeedbackItem = {
  questionId: string;
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  aiFeedback: string;
  score?: number;
  strengths: string[];
  improvements: string[];
};

export type InterviewFeedbackSession = {
  sessionId: string;
  mode: string;
  title: string;
  completedAt: string;
  totalQuestions: number;
  answeredQuestions: number;
  totalTimeSeconds: number;
  averageScore?: number;
  strongestArea?: string;
  mainImprovementArea?: string;
  items: InterviewFeedbackItem[];
};

async function getAccessToken() {
  const token = await getFirebaseIdToken();

  if (!token) {
    throw new Error('You must be signed in to use the AI interview assistant.');
  }

  return token;
}

async function assistantFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let detail = `Assistant request failed: ${response.status}`;

    try {
      const body = (await response.json()) as { detail?: string; error?: string };
      if (body.detail) {
        detail = body.detail;
      } else if (body.error) {
        detail = body.error;
      }
    } catch {
      // Keep the status-based message when the response is not JSON.
    }

    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function getAssistantSessionType(mode: string): AssistantSessionType | null {
  if (mode === 'behavioral' || mode === 'technical' || mode === 'resume' || mode === 'job_posting') {
    return mode;
  }

  if (mode === 'general') {
    return 'mixed';
  }

  return null;
}

export function createAssistantSession(sessionType: AssistantSessionType) {
  return assistantFetch<CreateAssistantSessionResponse>('/api/sessions/', {
    method: 'POST',
    body: JSON.stringify({ session_type: sessionType }),
  });
}

export function submitAssistantTurn(sessionId: string, turnIndex: number, answerText: string) {
  return assistantFetch<SubmitAssistantTurnResponse>(`/api/sessions/${sessionId}/turns`, {
    method: 'POST',
    body: JSON.stringify({ turn_index: turnIndex, answer_text: answerText }),
  });
}

export function updateAssistantSessionStatus(sessionId: string, status: 'completed' | 'abandoned') {
  return assistantFetch<{ success: boolean }>(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function generateAssistantReport(sessionId: string) {
  return assistantFetch<GenerateReportResponse>(`/api/reports/${sessionId}`, {
    method: 'POST',
  });
}

export function getAssistantReport(sessionId: string) {
  return assistantFetch<GenerateReportResponse>(`/api/reports/${sessionId}`);
}

export function getSessionHistory(query?: string) {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set('q', query.trim());
  }

  return assistantFetch<SessionListResponse>(`/api/sessions/${params.size > 0 ? `?${params.toString()}` : ''}`);
}

export function getDashboardStats() {
  return assistantFetch<DashboardStatsResponse>('/api/sessions/stats');
}

export function getWeeklyProgress() {
  return assistantFetch<WeeklyProgressResponse>('/api/sessions/weekly-progress');
}

export function getWeeklyGoal() {
  return assistantFetch<WeeklyGoalResponse>('/api/sessions/weekly-goal');
}

export function updateWeeklyGoal(targetSessions: number) {
  return assistantFetch<WeeklyGoalResponse>('/api/sessions/weekly-goal', {
    method: 'PUT',
    body: JSON.stringify({ target_sessions: targetSessions }),
  });
}

export function getFocusArea() {
  return assistantFetch<FocusAreaResponse>('/api/sessions/focus-area');
}

export function getSessionDetail(sessionId: string) {
  return assistantFetch<SessionDetailResponse>(`/api/sessions/${sessionId}`);
}
