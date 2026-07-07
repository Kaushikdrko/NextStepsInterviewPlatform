export type PracticeMode = 'behavioral' | 'technical' | 'resume' | 'job_posting' | 'general';

export type CompletedInterviewAnswer = {
  questionId: string;
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  timeSpentSeconds: number;
  submittedAt: string;
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
  userId: string;
  mode: PracticeMode;
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

type CreateInterviewFeedbackSessionInput = {
  userId: string;
  mode: PracticeMode;
  title: string;
  totalQuestions: number;
  totalTimeSeconds: number;
  completedAt?: string;
  answers: CompletedInterviewAnswer[];
};

const STORAGE_PREFIX = 'yns.interviewFeedback.';
const STORAGE_INDEX_KEY = 'yns.interviewFeedback.index';

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hasAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function getMostCommon(items: string[]) {
  if (items.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function evaluateAnswer(answer: string): Pick<InterviewFeedbackItem, 'aiFeedback' | 'score' | 'strengths' | 'improvements'> {
  const trimmedAnswer = answer.trim();

  if (!trimmedAnswer) {
    return {
      aiFeedback: 'No answer was submitted for this question, so there is not enough signal to evaluate the response.',
      score: 0,
      strengths: [],
      improvements: ['Submit a complete answer so feedback can evaluate structure, detail, and relevance.'],
    };
  }

  const wordCount = countWords(trimmedAnswer);
  const hasStructure = hasAny(trimmedAnswer, [/\b(situation|task|action|result)\b/i, /\b(first|then|finally)\b/i]);
  const hasSpecifics = hasAny(trimmedAnswer, [/\b\d+[%\w-]*\b/, /\b(project|team|customer|user|class|internship|role)\b/i]);
  const hasImpact = hasAny(trimmedAnswer, [/\b(impact|result|improved|reduced|increased|learned|delivered|built|launched|solved)\b/i]);
  const connectsToRole = hasAny(trimmedAnswer, [/\b(role|company|position|job|interviewer|team|skill)\b/i]);

  let score = 48;
  if (wordCount >= 35) score += 12;
  if (wordCount >= 75) score += 8;
  if (hasStructure) score += 10;
  if (hasSpecifics) score += 10;
  if (hasImpact) score += 12;
  if (connectsToRole) score += 6;
  if (wordCount < 18) score -= 12;
  score = Math.max(35, Math.min(96, score));

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (wordCount >= 35) strengths.push('Clear response length');
  if (hasStructure) strengths.push('Organized structure');
  if (hasSpecifics) strengths.push('Specific examples');
  if (hasImpact) strengths.push('Impact-focused answer');
  if (connectsToRole) strengths.push('Role relevance');
  if (strengths.length === 0) strengths.push('Direct answer');

  if (wordCount < 45) improvements.push('Add more detail and context.');
  if (!hasStructure) improvements.push('Use a clearer beginning, middle, and result.');
  if (!hasSpecifics) improvements.push('Include a concrete example, metric, project, or responsibility.');
  if (!hasImpact) improvements.push('Explain the outcome or what changed because of your actions.');
  if (!connectsToRole) improvements.push('Connect the answer back to the role or interview focus.');

  const scoreSummary =
    score >= 85
      ? 'This is a strong answer with useful detail and a clear connection to the interview question.'
      : score >= 70
        ? 'This answer is solid and understandable, with a few opportunities to make it more memorable.'
        : 'This answer gives a starting point, but it would be stronger with more structure, specificity, and outcome detail.';

  return {
    aiFeedback: `${scoreSummary} ${improvements[0] ?? 'Keep the response concise while preserving the specific evidence that makes it credible.'}`,
    score,
    strengths,
    improvements,
  };
}

export function createInterviewFeedbackSession(input: CreateInterviewFeedbackSessionInput): InterviewFeedbackSession {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const items = input.answers
    .slice()
    .sort((a, b) => a.questionNumber - b.questionNumber)
    .map<InterviewFeedbackItem>((answer) => ({
      questionId: answer.questionId,
      questionNumber: answer.questionNumber,
      questionText: answer.questionText,
      userAnswer: answer.userAnswer,
      ...evaluateAnswer(answer.userAnswer),
    }));

  const scoredItems = items.filter((item) => typeof item.score === 'number' && item.userAnswer.trim().length > 0);
  const averageScore =
    scoredItems.length > 0
      ? Math.round(scoredItems.reduce((total, item) => total + (item.score ?? 0), 0) / scoredItems.length)
      : undefined;

  return {
    sessionId: createSessionId(),
    userId: input.userId,
    mode: input.mode,
    title: input.title,
    completedAt,
    totalQuestions: input.totalQuestions,
    answeredQuestions: items.filter((item) => item.userAnswer.trim().length > 0).length,
    totalTimeSeconds: input.totalTimeSeconds,
    averageScore,
    strongestArea: getMostCommon(items.flatMap((item) => item.strengths)),
    mainImprovementArea: getMostCommon(items.flatMap((item) => item.improvements)),
    items,
  };
}

export function saveInterviewFeedbackSession(session: InterviewFeedbackSession) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(`${STORAGE_PREFIX}${session.sessionId}`, JSON.stringify(session));

  const rawIndex = window.localStorage.getItem(STORAGE_INDEX_KEY);
  let index: string[] = [];

  try {
    index = rawIndex ? (JSON.parse(rawIndex) as string[]) : [];
  } catch {
    index = [];
  }

  const nextIndex = [session.sessionId, ...index.filter((id) => id !== session.sessionId)].slice(0, 20);
  window.localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(nextIndex));
}

export function getInterviewFeedbackSession(sessionId: string): InterviewFeedbackSession | null {
  if (typeof window === 'undefined') return null;

  const rawSession = window.localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as InterviewFeedbackSession;
  } catch {
    return null;
  }
}
