'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Square,
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
import { usePushToTalkTranscription } from '@/hooks/use-push-to-talk-transcription';
import {
  createAssistantSession,
  getAssistantSessionType,
  submitAssistantTurn,
  updateAssistantSessionStatus,
  type PlannedQuestion,
  type TurnEvaluation,
} from '@/lib/services/interview-assistant';
import { getCurrentJobPosting, saveCurrentJobPosting, importJobPosting } from '@/lib/services/job-postings';
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
  const assistantSessionType = getAssistantSessionType(selectedMode);
  const isAssistantMode = assistantSessionType !== null;
  const fallbackQuestions = useMemo(() => questionsByMode[selectedMode], [selectedMode]);
  const title = modeLabels[selectedMode];

  const [assistantSessionId, setAssistantSessionId] = useState<string | null>(null);
  const [assistantQuestions, setAssistantQuestions] = useState<InterviewQuestion[]>([]);
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
  const [isComplete, setIsComplete] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [startedSessionMode, setStartedSessionMode] = useState<PracticeMode | null>(selectedMode !== 'job_posting' && selectedMode !== 'behavioral' ? selectedMode : null);
  const hasStartedSession = startedSessionMode === selectedMode;
  const [behavioralStyle, setBehavioralStyle] = useState<'general' | 'job'>('general');
  const [isImportingPosting, setIsImportingPosting] = useState(false);
  const [jobPostingId, setJobPostingId] = useState<string | undefined>();
  const [jobCompany, setJobCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [isLoadingJobPosting, setIsLoadingJobPosting] = useState(false);
  const [isSavingJobPosting, setIsSavingJobPosting] = useState(false);
  const [jobPostingMessage, setJobPostingMessage] = useState('');
  const [jobPostingError, setJobPostingError] = useState('');
  const selectedPostingId = selectedMode === 'job_posting' || (selectedMode === 'behavioral' && behavioralStyle === 'job') ? jobPostingId : undefined;
  const answerActionInFlightRef = useRef(false);
  const completionInFlightRef = useRef(false);

  const appendTranscript = useCallback((transcript: string) => {
    setAnswer((currentAnswer) =>
      `${currentAnswer}${currentAnswer.trim() ? ' ' : ''}${transcript}`.trimStart(),
    );
    setIsSubmitted(false);
  }, []);

  const {
    phase: transcriptionPhase,
    elapsedSeconds: recordingElapsedSeconds,
    maxRecordingSeconds,
    error: transcriptionError,
    isRecording,
    isBusy: isTranscriptionBusy,
    startRecording,
    stopRecording,
    cancel: cancelTranscription,
  } = usePushToTalkTranscription({
    sessionId: assistantSessionId,
    onTranscript: appendTranscript,
  });

  const isPreparingInterview = isAssistantMode && assistantQuestions.length === 0 && !assistantError;
  const questions = assistantQuestions.length > 0 ? assistantQuestions : fallbackQuestions;
  const currentQuestion = questions[currentQuestionIndex];
  const isResumeSessionBlocked = selectedMode === 'resume' && Boolean(assistantError) && assistantQuestions.length === 0 && !isPreparingInterview;
  const questionNumber = currentQuestionIndex + 1;
  const progressValue = (questionNumber / questions.length) * 100;
  const words = countWords(answer);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isVoiceActive = isRecording || isTranscriptionBusy;
  const voiceStatusLabel =
    transcriptionPhase === 'requesting_permission'
      ? 'Requesting microphone access'
      : transcriptionPhase === 'recording'
        ? `Recording ${formatTime(recordingElapsedSeconds)} / ${formatTime(maxRecordingSeconds)}`
        : transcriptionPhase === 'uploading'
          ? 'Uploading recording securely'
          : transcriptionPhase === 'transcribing'
            ? 'Converting speech to text'
            : transcriptionPhase === 'completed'
              ? 'Transcript ready'
              : transcriptionPhase === 'error'
                ? 'Voice input needs attention'
                : 'Ready to record';
  const recordingButtonLabel = isRecording
    ? 'Stop and Transcribe'
    : isTranscriptionBusy
      ? 'Cancel Voice Input'
      : answer.trim()
        ? 'Record More'
        : 'Record Answer';
  const voiceSummaryLabel = isRecording
    ? formatTime(recordingElapsedSeconds)
    : isTranscriptionBusy
      ? 'Processing'
      : transcriptionPhase === 'completed'
        ? 'Ready'
        : transcriptionPhase === 'error'
          ? 'Error'
          : 'Idle';
  const canSubmit =
    !isCompletingSession &&
    !isSubmittingAnswer &&
    !isPreparingInterview &&
    !isVoiceActive &&
    (answer.trim().length > 0 || isSubmitted);

  useEffect(() => {
    if (isComplete || !hasStartedSession || isPreparingInterview) return;

    const intervalId = window.setInterval(() => {
      setSessionTimeSeconds((seconds) => seconds + 1);
      setQuestionTimeSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasStartedSession, isComplete, isPreparingInterview]);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswer('');
    setSubmittedAnswers([]);
    setIsSubmitted(false);
    setSessionTimeSeconds(0);
    setQuestionTimeSeconds(0);
    setIsComplete(false);
    setAssistantSessionId(null);
    setAssistantQuestions([]);
    setAssistantError('');
    setIsPreparingAssistant(false);
    setIsSubmittingAnswer(false);
    setStartedSessionMode(selectedMode !== 'job_posting' && selectedMode !== 'behavioral' ? selectedMode : null);
    setShowEndSessionModal(false);
  }, [selectedMode, assistantRestartKey]);

  useEffect(() => {
    if (!assistantSessionType || !hasStartedSession) {
      return;
    }

    const sessionType = assistantSessionType;
    let isMounted = true;

    async function prepareAssistantSession() {
      try {
        setIsPreparingAssistant(true);
        setAssistantError('');

        const assistantSession = await createAssistantSession(sessionType, {
          use_job_posting: selectedMode !== 'behavioral' || behavioralStyle === 'job',
          job_posting_id: selectedPostingId,
        });

        if (!isMounted) return;

        const plannedQuestions = assistantSession.session_plan.questions.map((question) => mapPlannedQuestion(question, selectedMode));

        if (plannedQuestions.length === 0) {
          throw new Error('AI did not return any questions. Please try starting the interview again.');
        }

        setAssistantSessionId(assistantSession.session_id);
        setAssistantQuestions(plannedQuestions);
        setCurrentQuestionIndex(0);
        setSessionTimeSeconds(0);
        setQuestionTimeSeconds(0);
      } catch (error) {
        if (isMounted) {
          setAssistantSessionId(null);
          setAssistantQuestions([]);
          const message = error instanceof Error ? error.message : 'Unable to prepare your interview. Please try again.';
          setAssistantError(message);
          if (selectedMode === 'behavioral' || selectedMode === 'job_posting') {
            setJobPostingError(message);
            setStartedSessionMode(null);
          }
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
  }, [assistantSessionType, selectedMode, hasStartedSession, behavioralStyle, selectedPostingId, assistantRestartKey]);

  useEffect(() => {
    if (selectedMode !== 'job_posting' && selectedMode !== 'behavioral') return;

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

  const completeSession = async () => {
    if (completionInFlightRef.current) return;

    try {
      completionInFlightRef.current = true;
      setIsCompletingSession(true);
      setCompletionError('');
      await cancelTranscription();

      if (!assistantSessionId) {
        throw new Error('Backend feedback is not available for this interview mode yet.');
      }

      await updateAssistantSessionStatus(assistantSessionId, 'completed');
      router.push(`/practice/session/${assistantSessionId}/feedback`);
    } catch (error) {
      completionInFlightRef.current = false;
      answerActionInFlightRef.current = false;
      setCompletionError(error instanceof Error ? error.message : 'Unable to generate interview feedback.');
      setIsCompletingSession(false);
    }
  };

  const goToNextQuestion = () => {
    if (isLastQuestion) {
      void completeSession();
      return;
    }

    setCurrentQuestionIndex((index) => index + 1);
    setAnswer('');
    setIsSubmitted(false);
    setQuestionTimeSeconds(0);
    void cancelTranscription();
  };

  const handleSubmitAnswer = async () => {
    if (answerActionInFlightRef.current || isCompletingSession || isPreparingInterview || isVoiceActive) return;

    if (!isSubmitted) {
      if (!answer.trim()) return;

      answerActionInFlightRef.current = true;
      let didSaveAnswer = false;
      try {
        setIsSubmittingAnswer(true);
        setAssistantError('');

        let feedback: Pick<SubmittedAnswer, 'aiFeedback' | 'score' | 'strengths' | 'improvements'> | undefined;

        if (assistantSessionId) {
          const turn = await submitAssistantTurn(assistantSessionId, currentQuestionIndex, answer.trim());
          if (turn.evaluation) {
            feedback = getEvaluationFeedback(turn.evaluation);
          }
        }

        saveCurrentAnswer(answer, feedback);
        setIsSubmitted(true);
        didSaveAnswer = true;
      } catch (error) {
        setAssistantError(error instanceof Error ? error.message : 'Unable to save your answer. Please try submitting again.');
      } finally {
        if (didSaveAnswer) {
          window.setTimeout(() => {
            answerActionInFlightRef.current = false;
          }, 250);
        } else {
          answerActionInFlightRef.current = false;
        }
        setIsSubmittingAnswer(false);
      }
      return;
    }

    answerActionInFlightRef.current = true;
    goToNextQuestion();
    window.setTimeout(() => {
      answerActionInFlightRef.current = false;
    }, 250);
  };

  const handleSkipQuestion = async () => {
    if (answerActionInFlightRef.current || isCompletingSession || isPreparingInterview || isVoiceActive) return;

    answerActionInFlightRef.current = true;
    if (!isSubmitted) {
      if (assistantSessionId) {
        try {
          setIsSubmittingAnswer(true);
          setAssistantError('');
          await submitAssistantTurn(assistantSessionId, currentQuestionIndex, '');
        } catch (error) {
          answerActionInFlightRef.current = false;
          setIsSubmittingAnswer(false);
          setAssistantError(error instanceof Error ? error.message : 'Unable to save this skipped question. Please try again.');
          return;
        } finally {
          setIsSubmittingAnswer(false);
        }
      }

      saveCurrentAnswer('');
    }

    if (isLastQuestion) {
      void completeSession();
      return;
    }

    goToNextQuestion();
    window.setTimeout(() => {
      answerActionInFlightRef.current = false;
    }, 250);
  };

  const handleRecordingAction = () => {
    if (isRecording) {
      void stopRecording();
      return;
    }

    if (isTranscriptionBusy) {
      void cancelTranscription();
      return;
    }

    void startRecording();
  };

  const handleConfirmEndSession = async () => {
    if (completionInFlightRef.current || answerActionInFlightRef.current || isVoiceActive) return;

    if (!isSubmitted && answer.trim()) {
      answerActionInFlightRef.current = true;
      try {
        setIsSubmittingAnswer(true);
        setAssistantError('');
        let feedback: Pick<SubmittedAnswer, 'aiFeedback' | 'score' | 'strengths' | 'improvements'> | undefined;

        if (assistantSessionId) {
          const turn = await submitAssistantTurn(assistantSessionId, currentQuestionIndex, answer.trim());
          if (turn.evaluation) {
            feedback = getEvaluationFeedback(turn.evaluation);
          }
        }

        saveCurrentAnswer(answer, feedback);
      } catch (error) {
        setAssistantError(error instanceof Error ? error.message : 'Unable to save your answer. Please try again.');
        return;
      } finally {
        answerActionInFlightRef.current = false;
        setIsSubmittingAnswer(false);
      }
    }

    setShowEndSessionModal(false);
    void completeSession();
  };

  const resetPractice = () => {
    void cancelTranscription();
    setCurrentQuestionIndex(0);
    setAnswer('');
    setSubmittedAnswers([]);
    setIsSubmitted(false);
    setSessionTimeSeconds(0);
    setQuestionTimeSeconds(0);
    setIsComplete(false);
    setIsCompletingSession(false);
    setCompletionError('');
    setAssistantSessionId(null);
    setAssistantQuestions([]);
    setAssistantError('');
    setIsPreparingAssistant(false);
    setIsSubmittingAnswer(false);
    setAssistantRestartKey((key) => key + 1);
    setStartedSessionMode(selectedMode !== 'job_posting' && selectedMode !== 'behavioral' ? selectedMode : null);
  };

  const handleImportPosting = async () => {
    try {
      setIsImportingPosting(true);
      setJobPostingError('');
      const posting = await importJobPosting(jobPostingUrl);
      setJobCompany(posting.company);
      setJobTitle(posting.job_title);
      setJobDescription(posting.job_description);
      setJobPostingMessage('Posting imported. Review the details before starting.');
    } catch (error) {
      setJobPostingError(error instanceof Error ? error.message : 'Unable to read this link. Paste the description below.');
    } finally {
      setIsImportingPosting(false);
    }
  };

  const startJobPostingSession = async () => {
    if (selectedMode === 'behavioral' && behavioralStyle === 'general') {
      setJobPostingError('');
      setAssistantError('');
      setStartedSessionMode(selectedMode);
      return;
    }
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
      setStartedSessionMode(selectedMode);
    } catch (error) {
      setJobPostingError(error instanceof Error ? error.message : 'Unable to save your job posting.');
    } finally {
      setIsSavingJobPosting(false);
    }
  };

  if (isComplete) {
    const answeredCount = submittedAnswers.filter((item) => item.answer.length > 0).length;

    return (
      <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
        <Sidebar />

        <div className="flex min-h-[calc(100svh-4rem)] items-center px-4 py-7 sm:px-6 sm:py-9 lg:min-h-screen lg:pl-[220px]">
          <section className="mx-auto w-full max-w-md rounded-[18px] border border-[#e8ded4] bg-white p-7 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1e9] text-[#ad2d1f]">
              <Bot className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#271f1b]">Interview Complete</h1>
            <p className="mt-2 text-sm font-semibold text-[#8a7c75]">{title}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-[#faf7f2] p-4">
                <p className="text-xs font-bold uppercase text-[#a3958b]">Questions answered</p>
                <p className="mt-1 text-xl font-extrabold text-[#271f1b]">
                  {answeredCount}/{questions.length}
                </p>
              </div>
              <div className="rounded-xl bg-[#faf7f2] p-4">
                <p className="text-xs font-bold uppercase text-[#a3958b]">Total time</p>
                <p className="mt-1 text-xl font-extrabold text-[#271f1b]">{formatTime(sessionTimeSeconds)}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-[#e8ded4] bg-white px-4 text-sm font-bold text-[#71645e] transition hover:bg-[#faf7f2]"
              >
                Back to Dashboard
              </Link>
              <button
                type="button"
                onClick={resetPractice}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[#ad2d1f] px-4 text-sm font-bold text-white shadow-sm shadow-indigo-100 transition hover:bg-[#992719]"
              >
                Practice Again
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if ((selectedMode === 'job_posting' || selectedMode === 'behavioral') && !hasStartedSession) {
    return (
      <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
        <Sidebar />

        <div className="min-h-[calc(100svh-4rem)] bg-[linear-gradient(180deg,#fbfaf7_0%,#fff4ef_100%)] px-4 py-5 sm:px-6 lg:min-h-screen lg:pl-[220px]">
          <div className="app-page-container lg:px-6">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="rounded-[18px] border-[#e8ded4]/80 shadow-lg shadow-slate-200/70">
                <CardHeader className="p-5 pb-0 sm:p-6 sm:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#ad2d1f] text-white shadow-md shadow-indigo-100">
                        <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-xl font-extrabold text-[#271f1b]">{selectedMode === 'behavioral' ? 'Behavioral interview' : 'Job posting details'}</CardTitle>
                        <p className="mt-1 text-sm font-semibold leading-6 text-[#8a7c75]">Choose your practice focus and review anything you want the interview to use.</p>
                      </div>
                    </div>
                    {isLoadingJobPosting ? <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-[#a3958b]" aria-hidden="true" /> : null}
                  </div>
                </CardHeader>

                <CardContent className="p-5 sm:p-6">
                  {jobPostingError && selectedMode === 'behavioral' && behavioralStyle === 'general' ? <Alert className="mb-6 border-rose-200 bg-rose-50 text-rose-800">{jobPostingError}</Alert> : null}
                  {selectedMode === 'behavioral' ? (
                    <fieldset className="mb-6 grid gap-3 sm:grid-cols-2">
                      <legend className="mb-3 text-sm font-extrabold text-[#271f1b]">How would you like to practice?</legend>
                      {([
                        ['general', 'General behavioral interview', 'Practice with questions based on your background.'],
                        ['job', 'Tailor to a job', 'Use a job description or import a posting link.'],
                      ] as const).map(([value, label, description]) => (
                        <label key={value} className={cn('cursor-pointer rounded-xl border p-4', behavioralStyle === value ? 'border-[#ad2d1f] bg-[#fff1e9]' : 'border-[#e8ded4] bg-[#faf7f2]')}>
                          <input type="radio" name="behavioral-style" value={value} checked={behavioralStyle === value} onChange={() => setBehavioralStyle(value)} className="mr-2 accent-[#ad2d1f]" />
                          <span className="text-sm font-extrabold">{label}</span>
                          <p className="mt-2 text-sm text-[#8a7c75]">{description}</p>
                        </label>
                      ))}
                    </fieldset>
                  ) : null}
                  {selectedMode !== 'behavioral' || behavioralStyle === 'job' ? <>
                  {jobPostingMessage ? (
                    <Alert className={cn('mb-6 flex gap-3 border-[#ead8cc] bg-[#fff1e9] text-indigo-900', !jobPostingId && 'border-amber-200 bg-amber-50 text-amber-900')}>
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[#992719]',
                          !jobPostingId && 'bg-amber-100 text-amber-700',
                        )}
                      >
                        {jobPostingId ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <div>
                        <p className="font-extrabold">{jobPostingId ? 'Saved job posting' : 'Job posting details'}</p>
                        <p className="mt-1 font-semibold leading-6">
                          {jobPostingMessage}
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
                        <p className="font-extrabold">Job posting needs attention</p>
                        <p className="mt-1 font-semibold leading-6">{jobPostingError}</p>
                      </div>
                    </Alert>
                  ) : null}

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="job-company" className="flex items-center gap-2 font-extrabold text-[#271f1b]">
                        <Building2 className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
                        Company
                      </Label>
                      <Input
                        id="job-company"
                        value={jobCompany}
                        onChange={(event) => setJobCompany(event.target.value)}
                        placeholder="e.g. Stripe"
                        className="h-12 rounded-xl border-[#e8ded4] bg-[#faf7f2]/60 px-4 font-semibold focus-visible:bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-title" className="flex items-center gap-2 font-extrabold text-[#271f1b]">
                        <ShieldCheck className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
                        Role title
                      </Label>
                      <Input
                        id="job-title"
                        value={jobTitle}
                        onChange={(event) => setJobTitle(event.target.value)}
                        placeholder="e.g. Software Engineer Intern"
                        className="h-12 rounded-xl border-[#e8ded4] bg-[#faf7f2]/60 px-4 font-semibold focus-visible:bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <Label htmlFor="job-url" className="flex items-center gap-2 font-extrabold text-[#271f1b]">
                      <LinkIcon className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
                      Posting URL
                    </Label>
                    <Input
                      id="job-url"
                      value={jobPostingUrl}
                      onChange={(event) => setJobPostingUrl(event.target.value)}
                      placeholder="https://company.com/careers/software-engineer-intern"
                      className="h-12 rounded-xl border-[#e8ded4] bg-[#faf7f2]/60 px-4 font-semibold focus-visible:bg-white"
                    />
                  </div>

                  <Button type="button" variant="outline" className="mt-3 rounded-xl" onClick={handleImportPosting} disabled={!jobPostingUrl.trim() || isImportingPosting || isSavingJobPosting}>
                    {isImportingPosting ? 'Importing posting...' : 'Import from link'}
                  </Button>
                  <p className="mt-2 text-sm text-[#8a7c75]">If the link cannot be read, paste the description below.</p>
                  <div className="mt-5 space-y-2">
                    <Label htmlFor="job-description" className="flex items-center gap-2 font-extrabold text-[#271f1b]">
                      <FileText className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
                      Job description
                    </Label>
                    <Textarea
                      id="job-description"
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      placeholder="Paste the responsibilities, qualifications, preferred skills, and any notes from the posting..."
                      className="min-h-[260px] resize-none rounded-xl border-[#e8ded4] bg-[#faf7f2]/60 p-4 font-semibold leading-6 shadow-inner shadow-slate-100 focus-visible:bg-white"
                    />
                    <p className="text-sm font-semibold leading-6 text-[#8a7c75]">Paste the full job description so the AI can generate more accurate questions.</p>
                  </div>

                  </> : null}
                  <Separator className="my-6" />

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link href="/practice" className={buttonVariants({ variant: 'outline', className: 'h-12 w-full rounded-xl px-5 font-extrabold sm:w-auto' })}>
                      Back to practice modes
                    </Link>
                    <Button
                      type="button"
                      onClick={startJobPostingSession}
                      disabled={isSavingJobPosting || isImportingPosting || (isLoadingJobPosting && (selectedMode !== 'behavioral' || behavioralStyle === 'job'))}
                      className="h-12 w-full gap-2 rounded-xl bg-[#ad2d1f] px-7 font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-[#992719] disabled:cursor-not-allowed disabled:bg-indigo-300 sm:w-auto"
                    >
                      {isSavingJobPosting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                      {isSavingJobPosting ? 'Saving...' : selectedMode === 'behavioral' && behavioralStyle === 'general' ? 'Start General Interview' : 'Save and Start Interview'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <aside className="space-y-5 xl:sticky xl:top-8">
                <Card className="rounded-[18px] border-[#e8ded4]/80 shadow-lg shadow-slate-200/60">
                  <CardContent className="p-5 sm:p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 text-lg font-extrabold text-[#271f1b]">How this interview will be personalized</h2>
                    <div className="mt-5 space-y-4">
                      {[
                        { icon: Building2, text: selectedMode === 'behavioral' && behavioralStyle === 'general' ? 'Behavioral questions based on your background' : 'Questions based on the company and role' },
                        { icon: FileText, text: 'Feedback on your experiences, decisions, and contributions' },
                        { icon: Clock3, text: 'Timer starts after you save and begin' },
                      ].map((item) => (
                        <div key={item.text} className="flex gap-3 rounded-xl border border-[#e8ded4] bg-[#faf7f2] p-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#ad2d1f] shadow-sm">
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

  if (isResumeSessionBlocked) {
    return (
      <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
        <Sidebar />

        <div className="min-h-[calc(100svh-4rem)] px-4 py-7 sm:px-6 sm:py-9 lg:min-h-screen lg:pl-[220px]">
          <div className="mx-auto w-full max-w-3xl space-y-6 lg:px-6">
            <header className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#8a7c75]">
                <Link href="/practice" className="text-[#ad2d1f] transition hover:text-[#992719]">
                  Interview Practice
                </Link>
                <ChevronRight className="h-4 w-4 text-[#a3958b]" aria-hidden="true" />
                <span className="text-[#271f1b]">{title}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#271f1b]">{title}</h1>
            </header>

            <Card className="rounded-[18px] border-amber-200 bg-amber-50 shadow-sm">
              <CardContent className="p-6 sm:p-7">
                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-amber-100 text-amber-700">
                    <AlertCircle className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold text-amber-950">Resume questions are not ready yet</h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-amber-900">{assistantError}</p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-amber-800">
                      Upload a PDF resume or try again after the resume finishes processing. The app will generate fresh resume-specific questions once the parsed resume is available.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={resetPractice}
                    className="h-11 rounded-xl bg-[#ad2d1f] px-5 font-extrabold text-white hover:bg-[#992719]"
                  >
                    Try Again
                  </Button>
                  <Link href="/profile#resume" className={buttonVariants({ variant: 'outline', className: 'h-11 rounded-xl px-5 font-extrabold' })}>
                    Upload Resume
                  </Link>
                  <Link href="/practice" className={buttonVariants({ variant: 'ghost', className: 'h-11 rounded-xl px-5 font-extrabold' })}>
                    Back to Practice
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
      <Sidebar />

      <div className="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-6 lg:min-h-screen lg:pl-[220px]">
        <div className="app-page-container flex min-h-[calc(100svh-7rem)] flex-col gap-5 lg:min-h-[calc(100svh-3rem)] lg:px-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#8a7c75]">
                <Link href="/practice" className="text-[#ad2d1f] transition hover:text-[#992719]">
                  Interview Practice
                </Link>
                <ChevronRight className="h-4 w-4 text-[#a3958b]" aria-hidden="true" />
                <span className="text-[#271f1b]">{title}</span>
              </div>
              <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight text-[#271f1b] sm:text-[28px]">{title}</h1>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e8ded4] bg-white px-4 text-sm font-extrabold text-[#271f1b] shadow-sm">
                <Clock3 className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
                {formatTime(sessionTimeSeconds)}
              </span>
              <button
                type="button"
                onClick={() => setShowEndSessionModal(true)}
                disabled={isCompletingSession || isVoiceActive}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e8ded4] bg-white px-5 text-sm font-extrabold text-[#71645e] shadow-sm transition hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                End Session
              </button>
            </div>
          </header>

          {assistantError ? (
            <Alert className="flex gap-3 border-amber-200 bg-amber-50 text-amber-900">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold leading-6">{assistantError}</p>
            </Alert>
          ) : null}

          {isPreparingInterview ? (
            <section className="rounded-[18px] border border-[#ead8cc] bg-white p-6 shadow-sm sm:p-8">
              <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#fff1e9] text-[#ad2d1f]">
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[#271f1b]">Building your personalized interview</h2>
                <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[#8a7c75]">
                  The AI is preparing fresh questions for this session. Your timer will start once the first generated question is ready.
                </p>

                <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
                  {[
                    { icon: Sparkles, title: 'Personalizing', description: 'Using your selected practice mode' },
                    { icon: Bot, title: 'Planning', description: 'Sequencing interview questions' },
                    { icon: ShieldCheck, title: 'Calibrating', description: 'Preparing the feedback rubric' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-xl border border-[#e8ded4] bg-[#faf7f2] p-4 text-left">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#ad2d1f] shadow-sm">
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-sm font-extrabold text-[#271f1b]">{item.title}</h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#8a7c75]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <div className="grid items-start gap-5 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.38fr)]">
            <section className="flex min-w-0 flex-col gap-4 self-stretch">
              <article className="rounded-[18px] border border-[#e8ded4] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff1e9] text-[#ad2d1f]">
                    <Bot className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#271f1b]">AI Interviewer</h2>
                    <p className="mt-0.5 text-xs font-medium text-[#8a7c75]">
                      Question {questionNumber} of {questions.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4" aria-live="polite">
                  <p className="break-words text-lg font-semibold leading-7 text-[#271f1b]">{currentQuestion.question}</p>
                </div>
              </article>

              <article className="flex flex-1 flex-col rounded-[18px] border border-[#e8ded4] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="interview-answer" className="text-base font-extrabold text-[#271f1b]">Your answer</label>
                  <span className="rounded-full bg-[#faf7f2] px-3 py-1 text-xs font-semibold text-[#71645e]">{words} {words === 1 ? 'word' : 'words'}</span>
                </div>
                <p id="answer-hint" className="mt-1 text-sm leading-6 text-[#8a7c75]">Write your response or use the microphone to talk it through.</p>
                <textarea
                  id="interview-answer"
                  aria-describedby="answer-hint"
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    if (isSubmitted) {
                      setIsSubmitted(false);
                    }
                  }}
                  placeholder="Type your answer or record it below..."
                  className="mt-3 min-h-[240px] w-full flex-1 resize-y rounded-xl border border-[#e8ded4] bg-[#fdfbf8] p-4 text-sm font-normal leading-6 text-[#443730] outline-none transition placeholder:text-[#a3958b] focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />

                <div className={cn(
                  'mt-4 flex flex-col gap-4 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4',
                  isRecording ? 'border-rose-200 bg-rose-50' : 'border-[#f0e2d7] bg-[#fcf7f2]',
                )}>
                  <div className="min-w-0 space-y-2" aria-live="polite">
                    {isSubmitted ? <p className="text-sm font-bold text-emerald-600">Answer submitted.</p> : null}
                    <p
                      className={cn(
                        'flex items-center gap-2 text-sm font-semibold',
                        transcriptionPhase === 'recording' && 'text-rose-700',
                        (transcriptionPhase === 'requesting_permission' ||
                          transcriptionPhase === 'uploading' ||
                          transcriptionPhase === 'transcribing') &&
                          'text-[#992719]',
                        transcriptionPhase === 'completed' && 'text-emerald-700',
                        (transcriptionPhase === 'idle' || transcriptionPhase === 'error') &&
                          'text-[#8a7c75]',
                      )}
                    >
                      {isRecording ? (
                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-600" aria-hidden="true" />
                      ) : isTranscriptionBusy ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                      ) : transcriptionPhase === 'completed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Mic className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                      {voiceStatusLabel}
                    </p>
                    {transcriptionPhase === 'completed' ? (
                      <p className="max-w-md text-sm font-semibold text-[#8a7c75]">
                        Review and edit the transcript before submitting your answer.
                      </p>
                    ) : null}
                    {!assistantSessionId && !isPreparingInterview ? (
                      <p className="max-w-md text-sm font-semibold text-amber-700">
                        Voice input requires an active AI interview session.
                      </p>
                    ) : null}
                    {transcriptionError ? (
                      <p className="max-w-md text-sm font-semibold text-rose-700">{transcriptionError}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleRecordingAction}
                    disabled={
                      isSubmitted ||
                      isCompletingSession ||
                      isSubmittingAnswer ||
                      isPreparingInterview ||
                      (!assistantSessionId && !isVoiceActive)
                    }
                    className={cn(
                      'inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-3 rounded-full border py-2 pl-2 pr-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ad2d1f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto',
                      isRecording
                        ? 'border-rose-700 bg-rose-700 text-white shadow-[0_4px_14px_rgba(190,18,60,0.20)] hover:bg-rose-800'
                        : isTranscriptionBusy
                          ? 'border-[#d8c9bc] bg-white text-[#71645e] hover:bg-[#f5efe8]'
                          : 'border-[#ad2d1f] bg-[#ad2d1f] text-white shadow-[0_4px_14px_rgba(173,45,31,0.22)] hover:bg-[#992719] hover:shadow-[0_6px_18px_rgba(173,45,31,0.28)]',
                    )}
                  >
                    <span className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      isTranscriptionBusy ? 'bg-[#f5efe8]' : 'bg-white/15',
                      isRecording && 'motion-safe:animate-pulse',
                    )}>
                      {isRecording ? (
                        <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      ) : isTranscriptionBusy ? (
                        <X className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Mic className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    {recordingButtonLabel}
                  </button>
                </div>
              </article>

              {completionError ? (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>{completionError}</p>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 px-0 sm:flex-row sm:items-center sm:justify-between sm:px-3">
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  disabled={isCompletingSession || isSubmittingAnswer || isPreparingAssistant || isVoiceActive}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 text-sm font-extrabold text-[#8a7c75] rounded-full px-3 transition hover:bg-[#f5efe8] hover:text-[#271f1b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <SkipForward className="h-4 w-4" aria-hidden="true" />
                  Skip Question
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!canSubmit}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#ad2d1f] px-7 text-sm font-extrabold text-white shadow-[0_8px_16px_rgba(173,45,31,0.20)] transition hover:bg-[#ad2d1f] disabled:cursor-not-allowed disabled:bg-indigo-300 sm:w-auto"
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

            <aside className="space-y-4 xl:sticky xl:top-6">
              <section className="rounded-[18px] border border-[#e8ded4] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-[#271f1b]">Session progress</h2>
                  <span className="text-sm font-extrabold text-[#271f1b]">
                    {questionNumber}/{questions.length}
                  </span>
                </div>
                <Progress value={progressValue} aria-label="Interview question progress" className="mt-4 h-2 bg-[#f1e5d9] [&>div]:bg-none [&>div]:bg-[#ad2d1f]" />

                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 text-[#8a7c75]">
                    <Clock3 className="h-5 w-5" aria-hidden="true" />
                    <span className="flex-1 text-sm font-extrabold">Session Time</span>
                    <span className="text-sm font-extrabold text-[#271f1b]">{formatTime(sessionTimeSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#8a7c75]">
                    <Mic className="h-5 w-5" aria-hidden="true" />
                    <span className="flex-1 text-sm font-extrabold">Voice Input</span>
                    <span
                      className={cn(
                        'text-sm font-extrabold',
                        isRecording && 'text-rose-700',
                        isTranscriptionBusy && 'text-[#992719]',
                        transcriptionPhase === 'completed' && 'text-emerald-700',
                        !isVoiceActive && transcriptionPhase !== 'completed' && 'text-[#8a7c75]',
                      )}
                    >
                      {voiceSummaryLabel}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-[18px] border border-[#e8ded4] bg-[#fff8e8] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffedb8] text-[#a76c19]">
                    <Lightbulb className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="text-base font-extrabold text-[#271f1b]">A little guidance</h2>
                </div>

                <ul className="mt-4 space-y-3 text-sm font-medium leading-6 text-[#71645e]">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ad2d1f]" />
                    <span>Use the STAR method: Situation, Task, Action, Result.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ad2d1f]" />
                    <span>Take a breath before answering — clarity beats speed.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ad2d1f]" />
                    <span>Give specific examples rather than general statements.</span>
                  </li>
                </ul>
              </section>
            </aside>
            </div>
          )}
        </div>
      </div>

      {showEndSessionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <section className="w-full max-w-sm rounded-[18px] border border-[#e8ded4] bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-[#271f1b]">End interview session?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#8a7c75]">Your current progress will be saved for this session.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEndSessionModal(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e8ded4] bg-white px-4 text-sm font-bold text-[#71645e] transition hover:bg-[#faf7f2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndSession}
                disabled={isCompletingSession || isVoiceActive}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#ad2d1f] px-4 text-sm font-bold text-white transition hover:bg-[#992719] disabled:cursor-not-allowed disabled:bg-indigo-300"
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
