import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { API_BASE_URL } from '@/lib/utils/api-client';

export type AssistantSessionType = 'behavioral' | 'technical' | 'mixed' | 'resume';

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
  evaluation: TurnEvaluation;
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
};

export type SessionListResponse = {
  sessions: SessionSummary[];
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
  created_at: string;
  completed_at: string | null;
  turns: SessionTurnDetail[];
};

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session?.access_token) {
    throw new Error('You must be signed in to use the AI interview assistant.');
  }

  return session.access_token;
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
  if (mode === 'behavioral' || mode === 'technical' || mode === 'resume') {
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

export function generateAssistantReport(sessionId: string) {
  return assistantFetch<GenerateReportResponse>(`/api/reports/${sessionId}`, {
    method: 'POST',
  });
}

export function getSessionHistory() {
  return assistantFetch<SessionListResponse>('/api/sessions/');
}

export function getSessionDetail(sessionId: string) {
  return assistantFetch<SessionDetailResponse>(`/api/sessions/${sessionId}`);
}
