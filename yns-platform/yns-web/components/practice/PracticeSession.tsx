'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Lightbulb,
  LinkIcon,
  Loader2,
  Mic,
  Send,
  ShieldCheck,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  createAssistantSession,
  getAssistantSessionType,
  submitAssistantTurn,
  type PlannedQuestion,
  type TurnEvaluation,
} from '@/lib/services/interview-assistant';
import { createInterviewFeedbackSession, saveInterviewFeedbackSession } from '@/lib/services/interview-feedback';
import { getCurrentJobPosting, saveCurrentJobPosting } from '@/lib/services/job-postings';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type PracticeMode = 'behavioral' | 'technical' | 'resume' | 'job_posting' | 'general';

type InterviewQuestion = {
  id: string;
  mode: PracticeMode;
  question: string;
  intent?: string;
  rubricFocus?: string[];
};

type SubmittedAnswer = {
  questionId: string;
  questionNumber: number;
  question: string;
  answer: string;
  timeSpentSeconds: number;
  submittedAt: string;
  aiFeedback?: string;
  score?: number;
  strengths?: string[];
  improvements?: string[];
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type BrowserWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

const modeLabels: Record<PracticeMode, string> = {
  behavioral: 'Behavioral Interview',
  technical: 'Technical Interview',
  resume: 'Resume-Based Questions',
  job_posting: 'Job Posting Interview',
  general: 'General Mock Interview',
};

const questionsByMode: Record<PracticeMode, InterviewQuestion[]> = {
  behavioral: [
    { id: 'behavioral-1', mode: 'behavioral', question: 'Tell me about yourself.' },
    { id: 'behavioral-2', mode: 'behavioral', question: 'Describe a time you worked on a team project.' },
    { id: 'behavioral-3', mode: 'behavioral', question: 'Tell me about a time you faced a challenge and how you handled it.' },
    { id: 'behavioral-4', mode: 'behavioral', question: 'What are your strengths and weaknesses?' },
    { id: 'behavioral-5', mode: 'behavioral', question: 'Why are you interested in this role?' },
  ],
  technical: [
    { id: 'technical-1', mode: 'technical', question: 'Tell me about a technical project you built and the main challenge you faced.' },
    { id: 'technical-2', mode: 'technical', question: 'How would you design a simple API for an interview practice platform?' },
    { id: 'technical-3', mode: 'technical', question: 'Explain the difference between authentication and authorization.' },
    { id: 'technical-4', mode: 'technical', question: 'How would you debug a slow database query?' },
    { id: 'technical-5', mode: 'technical', question: 'Describe how you would handle errors in a production application.' },
  ],
  resume: [
    { id: 'resume-1', mode: 'resume', question: 'Walk me through the most important project on your resume.' },
    { id: 'resume-2', mode: 'resume', question: 'What was your specific contribution to that project?' },
    { id: 'resume-3', mode: 'resume', question: 'What technologies did you use and why?' },
    { id: 'resume-4', mode: 'resume', question: 'What would you improve if you rebuilt it?' },
    { id: 'resume-5', mode: 'resume', question: 'How did you measure success?' },
  ],
  job_posting: [
    { id: 'job-posting-1', mode: 'job_posting', question: 'Why are you interested in this company and role?' },
    { id: 'job-posting-2', mode: 'job_posting', question: 'Which skills from the job description match your background?' },
    { id: 'job-posting-3', mode: 'job_posting', question: 'Tell me about a project that relates to this position.' },
    { id: 'job-posting-4', mode: 'job_posting', question: 'What would make you successful in this role?' },
    { id: 'job-posting-5', mode: 'job_posting', question: 'What questions would you ask the interviewer?' },
  ],
  general: [
    { id: 'general-1', mode: 'general', question: 'Tell me about yourself.' },
    { id: 'general-2', mode: 'general', question: 'Tell me about a technical project you built and the main challenge you faced.' },
    { id: 'general-3', mode: 'general', question: 'Describe a time you worked on a team project.' },
    { id: 'general-4', mode: 'general', question: 'How would you debug a slow database query?' },
    { id: 'general-5', mode: 'general', question: 'Why are you interested in this role?' },
  ],
};

function getPracticeMode(value: string | null): PracticeMode {
  if (value === 'technical' || value === 'resume' || value === 'job_posting' || value === 'general') {
    return value;
  }

  return 'behavioral';
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function upsertSubmittedAnswer(answers: SubmittedAnswer[], submittedAnswer: SubmittedAnswer) {
  const existingIndex = answers.findIndex((item) => item.questionId === submittedAnswer.questionId);

  if (existingIndex === -1) {
    return [...answers, submittedAnswer];
  }

  return answers.map((item, index) => (index === existingIndex ? submittedAnswer : item));
}

function mapPlannedQuestion(question: PlannedQuestion, mode: PracticeMode): InterviewQuestion {
  return {
    id: question.id,
    mode,
    question: question.text,
    intent: question.intent,
    rubricFocus: question.rubric_focus,
  };
}

function getEvaluationFeedback(evaluation: TurnEvaluation): Pick<SubmittedAnswer, 'aiFeedback' | 'score' | 'strengths' | 'improvements'> {
  const dimensionFeedback = evaluation.dimensions.map((dimension) => `${dimension.name}: ${dimension.rationale}`);

  return {
    aiFeedback: [`Overall score: ${evaluation.overall}/5.`, ...dimensionFeedback].join(' '),
    score: Math.round((evaluation.overall / 5) * 100),
    strengths: evaluation.notable_strengths,
    improvements: evaluation.notable_gaps,
  };
}

export function PracticeSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMode = getPracticeMode(searchParams.get('mode'));
  const fallbackQuestions = useMemo(() => questionsByMode[selectedMode], [selectedMode]);
  const title = modeLabels[selectedMode];

  const [assistantSessionId, setAssistantSessionId] = useState<string | null>(null);
  const [assistantQuestions, setAssistantQuestions] = useState<InterviewQuestion[]>([]);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [assistantError, setAssistantError] = useState('');
  const [assistantRestartKey, setAssistantRestartKey] = useState(0);
  const [isPreparingAssistant, setIsPreparingAssistant] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sessionTimeSeconds, setSessionTimeSeconds] = useState(0);
  const [questionTimeSeconds, setQuestionTimeSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [hasStartedSession, setHasStartedSession] = useState(selectedMode !== 'job_posting');
  const [jobPostingId, setJobPostingId] = useState<string | undefined>();
  const [jobCompany, setJobCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [isLoadingJobPosting, setIsLoadingJobPosting] = useState(false);
  const [isSavingJobPosting, setIsSavingJobPosting] = useState(false);
  const [jobPostingMessage, setJobPostingMessage] = useState('');
  const [jobPostingError, setJobPostingError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const questions = assistantQuestions.length > 0 ? assistantQuestions : fallbackQuestions;
  const currentQuestion = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const progressValue = (questionNumber / questions.length) * 100;
  const words = countWords(answer);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const canSubmit = !isCompletingSession && !isSubmittingAnswer && !isPreparingAssistant && (answer.trim().length > 0 || isSubmitted);

  useEffect(() => {
    if (isComplete || !hasStartedSession) return;

    const intervalId = window.setInterval(() => {
      setSessionTimeSeconds((seconds) => seconds + 1);
      setQuestionTimeSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasStartedSession, isComplete]);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswer('');
    setSubmittedAnswers([]);
    setIsSubmitted(false);
    setSessionTimeSeconds(0);
    setQuestionTimeSeconds(0);
    setIsRecording(false);
    setRecordingError('');
    setIsComplete(false);
    setAssistantSessionId(null);
    setAssistantQuestions([]);
    setAssistantMessage('');
    setAssistantError('');
    setIsPreparingAssistant(false);
    setIsSubmittingAnswer(false);
    setHasStartedSession(selectedMode !== 'job_posting');
    setShowEndSessionModal(false);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, [selectedMode, assistantRestartKey]);

  useEffect(() => {
    const assistantSessionType = getAssistantSessionType(selectedMode);

    if (!assistantSessionType) {
      return;
    }

    const sessionType = assistantSessionType;
    let isMounted = true;

    async function prepareAssistantSession() {
      try {
        setIsPreparingAssistant(true);
        setAssistantError('');
        setAssistantMessage('Preparing personalized AI questions...');

        const assistantSession = await createAssistantSession(sessionType);

        if (!isMounted) return;

        setAssistantSessionId(assistantSession.session_id);
        setAssistantQuestions(assistantSession.session_plan.questions.map((question) => mapPlannedQuestion(question, selectedMode)));
        setAssistantMessage('AI assistant ready. Your answers will receive evaluator feedback.');
      } catch (error) {
        if (isMounted) {
          setAssistantSessionId(null);
          setAssistantQuestions([]);
          setAssistantMessage('');
          setAssistantError(error instanceof Error ? error.message : 'AI assistant is unavailable. Using built-in practice questions.');
        }
      } finally {
        if (isMounted) {
          setIsPreparingAssistant(false);
        }
      }
    }

    prepareAssistantSession();

    return () => {
      isMounted = false;
    };
  }, [selectedMode]);

  useEffect(() => {
    if (selectedMode !== 'job_posting') return;

    let isMounted = true;

    async function loadJobPosting() {
      try {
        setIsLoadingJobPosting(true);
        setJobPostingError('');
        setJobPostingMessage('');

        const posting = await getCurrentJobPosting();

        if (!isMounted) return;

        if (posting) {
          setJobPostingId(posting.id);
          setJobCompany(posting.company);
          setJobTitle(posting.job_title);
          setJobDescription(posting.job_description);
          setJobPostingUrl(posting.posting_url);
          setJobPostingMessage('Loaded your onboarding job posting. You can edit it before starting.');
        } else {
          setJobPostingMessage('No job posting found from onboarding yet. Add one below before starting.');
        }
      } catch (error) {
        if (isMounted) {
          setJobPostingError(error instanceof Error ? error.message : 'Unable to load your job posting.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingJobPosting(false);
        }
      }
    }

    loadJobPosting();

    return () => {
      isMounted = false;
    };
  }, [selectedMode]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const createSubmittedAnswer = (value: string, feedback?: Pick<SubmittedAnswer, 'aiFeedback' | 'score' | 'strengths' | 'improvements'>): SubmittedAnswer => ({
      questionId: currentQuestion.id,
      questionNumber,
      question: currentQuestion.question,
      answer: value.trim(),
      timeSpentSeconds: questionTimeSeconds,
      submittedAt: new Date().toISOString(),
      ...feedback,
  });

  const saveCurrentAnswer = (value: string, feedback?: Pick<SubmittedAnswer, 'aiFeedback' | 'score' | 'strengths' | 'improvements'>) => {
    const submittedAnswer = createSubmittedAnswer(value, feedback);

    setSubmittedAnswers((answers) => upsertSubmittedAnswer(answers, submittedAnswer));

    return submittedAnswer;
  };

  const completeSession = async (finalAnswers: SubmittedAnswer[]) => {
    try {
      setIsCompletingSession(true);
      setCompletionError('');
      stopRecording();

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        throw new Error(userError?.message ?? 'You must be signed in to view interview feedback.');
      }

      const feedbackSession = createInterviewFeedbackSession({
        userId: user.id,
        assistantSessionId,
        mode: selectedMode,
        title,
        totalQuestions: questions.length,
        totalTimeSeconds: sessionTimeSeconds,
        answers: finalAnswers.map((item) => ({
          questionId: item.questionId,
          questionNumber: item.questionNumber,
          questionText: item.question,
          userAnswer: item.answer,
          timeSpentSeconds: item.timeSpentSeconds,
          submittedAt: item.submittedAt,
          aiFeedback: item.aiFeedback,
          score: item.score,
          strengths: item.strengths,
          improvements: item.improvements,
        })),
      });

      saveInterviewFeedbackSession(feedbackSession);
      router.push(`/practice/session/${feedbackSession.sessionId}/feedback`);
    } catch (error) {
      setCompletionError(error instanceof Error ? error.message : 'Unable to generate interview feedback.');
      setIsCompletingSession(false);
    }
  };

  const goToNextQuestion = () => {
    if (isLastQuestion) {
      void completeSession(submittedAnswers);
      return;
    }

    setCurrentQuestionIndex((index) => index + 1);
    setAnswer('');
    setIsSubmitted(false);
    setQuestionTimeSeconds(0);
    setRecordingError('');
    stopRecording();
  };

  const handleSubmitAnswer = async () => {
    if (!isSubmitted) {
      if (!answer.trim()) return;

      try {
        setIsSubmittingAnswer(true);
        setAssistantError('');

        let feedback: Pick<SubmittedAnswer, 'aiFeedback' | 'score' | 'strengths' | 'improvements'> | undefined;

        if (assistantSessionId) {
          const turn = await submitAssistantTurn(assistantSessionId, currentQuestionIndex, answer.trim());
          feedback = getEvaluationFeedback(turn.evaluation);
          setAssistantMessage(turn.response_text);
        }

        saveCurrentAnswer(answer, feedback);
        setIsSubmitted(true);
      } catch (error) {
        setAssistantError(error instanceof Error ? error.message : 'AI evaluator was unavailable. Your answer was saved locally.');
        saveCurrentAnswer(answer);
        setIsSubmitted(true);
      } finally {
        setIsSubmittingAnswer(false);
      }
      return;
    }

    goToNextQuestion();
  };

  const handleSkipQuestion = () => {
    let nextAnswers = submittedAnswers;

    if (!isSubmitted) {
      const submittedAnswer = saveCurrentAnswer('');
      nextAnswers = upsertSubmittedAnswer(submittedAnswers, submittedAnswer);
    }

    if (isLastQuestion) {
      void completeSession(nextAnswers);
      return;
    }

    goToNextQuestion();
  };

  const startRecording = () => {
    setRecordingError('');

    const speechWindow = window as BrowserWithSpeechRecognition;
    const RecognitionConstructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      setIsRecording(true);
      setRecordingError('Voice transcription is not supported in this browser.');
      return;
    }

    try {
      const recognition = new RecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcriptParts: string[] = [];

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index]?.[0]?.transcript;

          if (transcript) {
            transcriptParts.push(transcript);
          }
        }

        if (transcriptParts.length > 0) {
          setAnswer((currentAnswer) => `${currentAnswer}${currentAnswer.trim() ? ' ' : ''}${transcriptParts.join(' ')}`.trimStart());
        }
      };

      recognition.onerror = (event) => {
        setRecordingError(event.error ? `Recording error: ${event.error}` : 'Recording could not start.');
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch {
      setRecordingError('Microphone permission was denied or recording could not start.');
      setIsRecording(false);
    }
  };

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    startRecording();
  };

  const handleConfirmEndSession = () => {
    const nextAnswers =
      !isSubmitted && answer.trim()
        ? upsertSubmittedAnswer(submittedAnswers, createSubmittedAnswer(answer))
        : submittedAnswers;

    if (nextAnswers !== submittedAnswers) {
      setSubmittedAnswers(nextAnswers);
    }

    setShowEndSessionModal(false);
    void completeSession(nextAnswers);
  };

  const resetPractice = () => {
    stopRecording();
    setCurrentQuestionIndex(0);
    setAnswer('');
    setSubmittedAnswers([]);
    setIsSubmitted(false);
    setSessionTimeSeconds(0);
    setQuestionTimeSeconds(0);
    setRecordingError('');
    setIsComplete(false);
    setIsCompletingSession(false);
    setCompletionError('');
    setAssistantSessionId(null);
    setAssistantQuestions([]);
    setAssistantMessage('');
    setAssistantError('');
    setIsPreparingAssistant(false);
    setIsSubmittingAnswer(false);
    setAssistantRestartKey((key) => key + 1);
    setHasStartedSession(selectedMode !== 'job_posting');
  };

  const startJobPostingSession = async () => {
    if (!jobDescription.trim()) {
      setJobPostingError('Add a job description before starting this interview.');
      return;
    }

    try {
      setIsSavingJobPosting(true);
      setJobPostingError('');

      const savedPosting = await saveCurrentJobPosting({
        id: jobPostingId,
        company: jobCompany,
        job_title: jobTitle,
        job_description: jobDescription,
        posting_url: jobPostingUrl,
      });

      setJobPostingId(savedPosting.id);
      setJobCompany(savedPosting.company);
      setJobTitle(savedPosting.job_title);
      setJobDescription(savedPosting.job_description);
      setJobPostingUrl(savedPosting.posting_url);
      setCurrentQuestionIndex(0);
      setAnswer('');
      setSubmittedAnswers([]);
      setIsSubmitted(false);
      setSessionTimeSeconds(0);
      setQuestionTimeSeconds(0);
      setHasStartedSession(true);
    } catch (error) {
      setJobPostingError(error instanceof Error ? error.message : 'Unable to save your job posting.');
    } finally {
      setIsSavingJobPosting(false);
    }
  };

  if (isComplete) {
    const answeredCount = submittedAnswers.filter((item) => item.answer.length > 0).length;

    return (
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <Sidebar />

        <div className="flex min-h-screen items-center px-4 py-8 sm:px-6 lg:pl-[220px]">
          <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Bot className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950">Interview Complete</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">{title}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Questions answered</p>
                <p className="mt-1 text-xl font-extrabold text-slate-950">
                  {answeredCount}/{questions.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Total time</p>
                <p className="mt-1 text-xl font-extrabold text-slate-950">{formatTime(sessionTimeSeconds)}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Dashboard
              </Link>
              <button
                type="button"
                onClick={resetPractice}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700"
              >
                Practice Again
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (selectedMode === 'job_posting' && !hasStartedSession) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <Sidebar />

        <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-5 sm:px-6 lg:pl-[220px]">
          <div className="mx-auto w-full max-w-6xl lg:px-6">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="rounded-2xl border-slate-200/80 shadow-lg shadow-slate-200/70">
                <CardHeader className="p-5 pb-0 sm:p-6 sm:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
                        <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-xl font-extrabold text-slate-950">Job posting details</CardTitle>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">Edit anything you want the interview to use.</p>
                      </div>
                    </div>
                    {isLoadingJobPosting ? <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-slate-400" aria-hidden="true" /> : null}
                  </div>
                </CardHeader>

                <CardContent className="p-5 sm:p-6">
                  {jobPostingMessage ? (
                    <Alert className={cn('mb-6 flex gap-3 border-indigo-100 bg-indigo-50 text-indigo-900', !jobPostingId && 'border-amber-200 bg-amber-50 text-amber-900')}>
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700',
                          !jobPostingId && 'bg-amber-100 text-amber-700',
                        )}
                      >
                        {jobPostingId ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <div>
                        <p className="font-extrabold">{jobPostingId ? 'Onboarding job posting loaded' : 'No job posting found yet'}</p>
                        <p className="mt-1 font-semibold leading-6">
                          {jobPostingId
                            ? jobPostingMessage
                            : 'Add the company, role title, and job description below to generate a tailored interview.'}
                        </p>
                      </div>
                    </Alert>
                  ) : null}
                  {jobPostingError ? (
                    <Alert className="mb-6 flex gap-3 border-rose-200 bg-rose-50 text-rose-800">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-extrabold">Could not save job posting</p>
                        <p className="mt-1 font-semibold leading-6">{jobPostingError}</p>
                      </div>
                    </Alert>
                  ) : null}

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="job-company" className="flex items-center gap-2 font-extrabold text-slate-950">
                        <Building2 className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                        Company
                      </Label>
                      <Input
                        id="job-company"
                        value={jobCompany}
                        onChange={(event) => setJobCompany(event.target.value)}
                        placeholder="e.g. Stripe"
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/60 px-4 font-semibold focus-visible:bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-title" className="flex items-center gap-2 font-extrabold text-slate-950">
                        <ShieldCheck className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                        Role title
                      </Label>
                      <Input
                        id="job-title"
                        value={jobTitle}
                        onChange={(event) => setJobTitle(event.target.value)}
                        placeholder="e.g. Software Engineer Intern"
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/60 px-4 font-semibold focus-visible:bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <Label htmlFor="job-url" className="flex items-center gap-2 font-extrabold text-slate-950">
                      <LinkIcon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                      Posting URL
                    </Label>
                    <Input
                      id="job-url"
                      value={jobPostingUrl}
                      onChange={(event) => setJobPostingUrl(event.target.value)}
                      placeholder="https://company.com/careers/software-engineer-intern"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/60 px-4 font-semibold focus-visible:bg-white"
                    />
                  </div>

                  <div className="mt-5 space-y-2">
                    <Label htmlFor="job-description" className="flex items-center gap-2 font-extrabold text-slate-950">
                      <FileText className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                      Job description
                    </Label>
                    <Textarea
                      id="job-description"
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      placeholder="Paste the responsibilities, qualifications, preferred skills, and any notes from the posting..."
                      className="min-h-[260px] resize-none rounded-xl border-slate-200 bg-slate-50/60 p-4 font-semibold leading-6 shadow-inner shadow-slate-100 focus-visible:bg-white"
                    />
                    <p className="text-sm font-semibold leading-6 text-slate-500">Paste the full job description so the AI can generate more accurate questions.</p>
                  </div>

                  <Separator className="my-6" />

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link href="/practice" className={buttonVariants({ variant: 'outline', className: 'h-12 w-full rounded-xl px-5 font-extrabold sm:w-auto' })}>
                      Back to practice modes
                    </Link>
                    <Button
                      type="button"
                      onClick={startJobPostingSession}
                      disabled={isSavingJobPosting || isLoadingJobPosting}
                      className="h-12 w-full gap-2 rounded-xl bg-indigo-600 px-7 font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:w-auto"
                    >
                      {isSavingJobPosting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                      {isSavingJobPosting ? 'Saving...' : 'Save and Start Interview'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <aside className="space-y-5">
                <Card className="rounded-2xl border-slate-200/80 shadow-lg shadow-slate-200/60">
                  <CardContent className="p-5 sm:p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 text-lg font-extrabold text-slate-950">How this interview will be personalized</h2>
                    <div className="mt-5 space-y-4">
                      {[
                        { icon: Building2, text: 'Questions based on the company and role' },
                        { icon: FileText, text: 'Feedback tailored to the job responsibilities' },
                        { icon: Clock3, text: 'Timer starts after you save and begin' },
                      ].map((item) => (
                        <div key={item.text} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                            <item.icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <p className="text-sm font-bold leading-5 text-slate-600">{item.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex gap-3">
                        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                        <p className="text-sm font-bold leading-6 text-amber-900">Tip: Longer job descriptions create better AI questions.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="min-h-screen px-4 py-8 sm:px-6 lg:pl-[220px]">
        <div className="mx-auto w-full max-w-6xl space-y-7 lg:px-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <Link href="/practice" className="transition hover:text-slate-950">
                  Interview Practice
                </Link>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span className="text-slate-950">{title}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-950 shadow-sm">
                <Clock3 className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                {formatTime(sessionTimeSeconds)}
              </span>
              <button
                type="button"
                onClick={() => setShowEndSessionModal(true)}
                disabled={isCompletingSession}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                End Session
              </button>
            </div>
          </header>

          {assistantMessage || assistantError || isPreparingAssistant ? (
            <Alert className={cn('flex gap-3 border-indigo-100 bg-indigo-50 text-indigo-900', assistantError && 'border-amber-200 bg-amber-50 text-amber-900')}>
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700',
                  assistantError && 'bg-amber-100 text-amber-700',
                )}
              >
                {isPreparingAssistant ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : assistantError ? (
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <p className="text-sm font-bold leading-6">
                {isPreparingAssistant ? 'Preparing personalized AI questions...' : assistantError || assistantMessage}
              </p>
            </Alert>
          ) : null}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-5">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Bot className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-950">AI Interviewer</h2>
                    <p className="text-sm font-semibold text-slate-500">
                      Question {questionNumber} of {questions.length}
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-xl font-extrabold leading-tight text-slate-950">{currentQuestion.question}</p>
                {currentQuestion.intent ? <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{currentQuestion.intent}</p> : null}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-extrabold text-slate-950">Your Answer</h2>
                <textarea
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    if (isSubmitted) {
                      setIsSubmitted(false);
                    }
                  }}
                  placeholder="Type your answer here..."
                  className="mt-4 min-h-[150px] w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-800 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-500">
                      {words} {words === 1 ? 'word' : 'words'}
                    </p>
                    {isSubmitted ? <p className="text-sm font-bold text-emerald-600">Answer submitted.</p> : null}
                    {recordingError ? <p className="max-w-md text-sm font-semibold text-amber-600">{recordingError}</p> : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleRecordingToggle}
                    className={cn(
                      'inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold shadow-sm transition',
                      isRecording
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                </div>
              </article>

              {completionError ? (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>{completionError}</p>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4 px-3">
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  disabled={isCompletingSession || isSubmittingAnswer || isPreparingAssistant}
                  className="inline-flex h-10 items-center gap-2 text-sm font-extrabold text-slate-500 transition hover:text-slate-950"
                >
                  <SkipForward className="h-4 w-4" aria-hidden="true" />
                  Skip Question
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!canSubmit}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-7 text-sm font-extrabold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {isCompletingSession || isSubmittingAnswer || isPreparingAssistant ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {isPreparingAssistant
                    ? 'Preparing AI'
                    : isSubmittingAnswer
                      ? 'Evaluating Answer'
                      : isCompletingSession
                        ? 'Generating Feedback'
                        : isSubmitted
                          ? isLastQuestion
                            ? 'Finish Session'
                            : 'Next Question'
                          : 'Submit Answer'}
                </button>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-slate-500">Session Progress</h2>
                  <span className="text-sm font-extrabold text-slate-950">
                    {questionNumber}/{questions.length}
                  </span>
                </div>
                <Progress value={progressValue} className="mt-4 h-2 bg-indigo-100" />

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Clock3 className="h-5 w-5" aria-hidden="true" />
                    <span className="flex-1 text-sm font-extrabold">Session Time</span>
                    <span className="text-sm font-extrabold text-slate-950">{formatTime(sessionTimeSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <Mic className="h-5 w-5" aria-hidden="true" />
                    <span className="flex-1 text-sm font-extrabold">Recording</span>
                    <span className="text-sm font-extrabold text-slate-500">{isRecording ? 'Recording' : 'Idle'}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-100/70 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                    <Lightbulb className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-950">Tips</h2>
                </div>

                <ul className="mt-5 space-y-4 text-sm font-semibold leading-6 text-slate-500">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                    <span>Use the STAR method: Situation, Task, Action, Result.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                    <span>Take a breath before answering — clarity beats speed.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                    <span>Give specific examples rather than general statements.</span>
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {showEndSessionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-slate-950">End interview session?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Your current progress will be saved for this session.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEndSessionModal(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndSession}
                disabled={isCompletingSession}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isCompletingSession ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {isCompletingSession ? 'Generating...' : 'End Session'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
