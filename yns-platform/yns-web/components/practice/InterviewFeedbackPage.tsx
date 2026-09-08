'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarDays, ChevronRight, Loader2, LockKeyhole, RefreshCw } from 'lucide-react';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { AssistantReportCard } from '@/components/practice/AssistantReportCard';
import { FeedbackQuestionCard } from '@/components/practice/FeedbackQuestionCard';
import { FeedbackSummaryCard } from '@/components/practice/FeedbackSummaryCard';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  generateAssistantReport,
  getAssistantReport,
  getSessionDetail,
  type InterviewFeedbackItem,
  type InterviewFeedbackSession,
  type SessionDetailResponse,
  type SessionReport,
} from '@/lib/services/interview-assistant';

type PageStatus = 'loading' | 'ready' | 'empty' | 'error' | 'unauthorized';

type InterviewFeedbackPageProps = {
  sessionId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatSessionType(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getMostCommon(items: string[]) {
  if (items.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function getTotalTimeSeconds(session: SessionDetailResponse) {
  const startedAt = new Date(session.started_at).getTime();
  const endedAt = new Date(session.completed_at ?? session.created_at).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt <= startedAt) {
    return 0;
  }

  return Math.round((endedAt - startedAt) / 1000);
}

function mapSessionDetailToFeedback(session: SessionDetailResponse): InterviewFeedbackSession {
  const items = session.turns.map<InterviewFeedbackItem>((turn) => {
    const evaluation = turn.evaluation;
    const score = evaluation ? Math.round((evaluation.overall / 5) * 100) : undefined;
    const dimensionFeedback =
      evaluation?.dimensions.map((dimension) => `${dimension.name}: ${dimension.rationale}`) ?? [];

    return {
      questionId: turn.question.id,
      questionNumber: turn.turn_index + 1,
      questionText: turn.question.text,
      userAnswer: turn.answer_text,
      aiFeedback: evaluation
        ? [`Overall score: ${evaluation.overall}/5.`, ...dimensionFeedback].join(' ')
        : 'No AI feedback was saved for this answer.',
      score,
      strengths: evaluation?.notable_strengths ?? [],
      improvements: evaluation?.notable_gaps ?? [],
    };
  });
  const scoredItems = items.filter((item) => typeof item.score === 'number');

  return {
    sessionId: session.session_id,
    mode: session.session_type === 'mixed' ? 'general' : session.session_type,
    title: `${formatSessionType(session.session_type)} Interview`,
    completedAt: session.completed_at ?? session.created_at,
    totalQuestions: items.length,
    answeredQuestions: items.filter((item) => item.userAnswer.trim().length > 0).length,
    totalTimeSeconds: getTotalTimeSeconds(session),
    averageScore:
      scoredItems.length > 0
        ? Math.round(scoredItems.reduce((total, item) => total + (item.score ?? 0), 0) / scoredItems.length)
        : undefined,
    strongestArea: getMostCommon(items.flatMap((item) => item.strengths)),
    mainImprovementArea: getMostCommon(items.flatMap((item) => item.improvements)),
    items,
  };
}

function FeedbackState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
      <Sidebar />

      <div className="flex min-h-[calc(100svh-4rem)] items-center px-4 py-8 sm:px-6 lg:min-h-screen lg:pl-[220px]">
        <Card className="mx-auto w-full max-w-md rounded-xl border-[#e8ded4]">
          <CardContent className="p-7 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5efe8] text-[#71645e]">{icon}</span>
            <h1 className="mt-5 text-2xl font-extrabold text-[#271f1b]">{title}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#8a7c75]">{description}</p>
            {action ? <div className="mt-6">{action}</div> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
      <Sidebar />

      <div className="min-h-[calc(100svh-4rem)] px-4 py-8 sm:px-6 lg:min-h-screen lg:pl-[220px]">
        <div className="app-page-container space-y-5 lg:px-6">
          <div className="h-28 rounded-xl border border-[#e8ded4] bg-white p-6 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#a3958b]" aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-[#8a7c75]">Loading interview feedback...</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-[#e8ded4]/70" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-[#e8ded4]/70" />
        </div>
      </div>
    </main>
  );
}

export function InterviewFeedbackPage({ sessionId }: InterviewFeedbackPageProps) {
  const [status, setStatus] = useState<PageStatus>('loading');
  const [feedback, setFeedback] = useState<InterviewFeedbackSession | null>(null);
  const [assistantReport, setAssistantReport] = useState<SessionReport | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [reportMessage, setReportMessage] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadFeedback() {
      try {
        setStatus('loading');
        setMessage('');
        setReportStatus('idle');
        setReportMessage('');

        const session = await getSessionDetail(sessionId);
        if (!isMounted) return;

        const feedbackSession = mapSessionDetailToFeedback(session);

        setFeedback(feedbackSession);
        setStatus(feedbackSession.items.length > 0 ? 'ready' : 'empty');

        if (feedbackSession.answeredQuestions > 0) {
          try {
            setReportStatus('loading');
            setReportMessage('Loading full AI report...');

            let reportResponse;
            try {
              reportResponse = await getAssistantReport(sessionId);
            } catch {
              setReportMessage('Generating full AI report...');
              reportResponse = await generateAssistantReport(sessionId);
            }

            if (!isMounted) return;

            setAssistantReport(reportResponse.report);
            setReportStatus('ready');
            setReportMessage('');
          } catch (error) {
            if (isMounted) {
              setAssistantReport(null);
              setReportStatus('error');
              setReportMessage(error instanceof Error ? error.message : 'Unable to generate the full AI report.');
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Unable to load interview feedback.';
          setStatus(errorMessage.toLowerCase().includes('sign in') || errorMessage.includes('401') ? 'unauthorized' : 'error');
          setMessage(errorMessage);
        }
      }
    }

    loadFeedback();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'unauthorized') {
    return (
      <FeedbackState
        icon={<LockKeyhole className="h-6 w-6" aria-hidden="true" />}
        title="Sign in required"
        description={message}
        action={
          <Link href="/sign-in" className={buttonVariants({ className: 'w-full rounded-lg font-bold bg-[#ad2d1f] text-white hover:bg-[#992719] focus-visible:ring-[#ad2d1f]' })}>
            Go to Sign In
          </Link>
        }
      />
    );
  }

  if (status === 'error') {
    return (
      <FeedbackState
        icon={<AlertCircle className="h-6 w-6" aria-hidden="true" />}
        title="Feedback could not load"
        description={message}
        action={
          <Link href="/practice" className={buttonVariants({ variant: 'outline', className: 'w-full rounded-lg font-bold border-[#e8ded4] text-[#71645e] hover:bg-[#faf7f2] focus-visible:ring-[#ad2d1f]' })}>
            Start New Interview
          </Link>
        }
      />
    );
  }

  if (!feedback || status === 'empty') {
    return (
      <FeedbackState
        icon={<RefreshCw className="h-6 w-6" aria-hidden="true" />}
        title="No feedback yet"
        description={message || 'Complete an interview session to generate feedback.'}
        action={
          <Link href="/practice" className={buttonVariants({ className: 'w-full rounded-lg font-bold bg-[#ad2d1f] text-white hover:bg-[#992719] focus-visible:ring-[#ad2d1f]' })}>
            Start New Interview
          </Link>
        }
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
      <Sidebar />

      <div className="min-h-[calc(100svh-4rem)] px-4 py-8 sm:px-6 lg:min-h-screen lg:pl-[220px]">
        <div className="app-page-container space-y-6 lg:px-6">
          <header className="rounded-xl border border-[#e8ded4] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#8a7c75]">
              <Link href="/practice" className="text-[#ad2d1f] transition hover:text-[#992719]">
                Interview Practice
              </Link>
              <ChevronRight className="h-4 w-4 text-[#a3958b]" aria-hidden="true" />
              <span className="text-[#271f1b]">Feedback</span>
            </div>

            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-2xl font-extrabold text-[#271f1b] sm:text-3xl">Interview Feedback</h1>
                <p className="mt-2 text-base font-semibold leading-7 text-[#8a7c75]">
                  Review your answers and AI feedback from this session.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="border-0 bg-[#fff1e9] px-3 py-1 text-[#992719]">{feedback.title}</Badge>
                <Badge className="gap-2 border-0 bg-[#f5efe8] px-3 py-1 text-[#71645e]">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDate(feedback.completedAt)}
                </Badge>
              </div>
            </div>
          </header>

          <FeedbackSummaryCard feedback={feedback} />

          {reportStatus === 'loading' ? (
            <Card className="rounded-xl border-[#ead8cc] bg-[#fff1e9]/60 shadow-sm">
              <CardContent className="flex items-center gap-3 p-5 text-sm font-bold text-[#71382b]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {reportMessage || 'Generating full AI report...'}
              </CardContent>
            </Card>
          ) : null}

          {reportStatus === 'error' ? (
            <Card className="rounded-xl border-amber-200 bg-amber-50 shadow-sm">
              <CardContent className="flex items-start gap-3 p-5 text-sm font-bold leading-6 text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>Full AI report unavailable: {reportMessage}</p>
              </CardContent>
            </Card>
          ) : null}

          {assistantReport ? <AssistantReportCard report={assistantReport} /> : null}

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#271f1b]">Question Feedback</h2>
              <p className="mt-1 text-sm font-semibold text-[#8a7c75]">One review card per completed interview question.</p>
            </div>

            {feedback.items.map((item) => (
              <FeedbackQuestionCard key={item.questionId} item={item} />
            ))}
          </section>

          <footer className="flex flex-col gap-3 rounded-xl border border-[#e8ded4] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Link href="/dashboard" className={buttonVariants({ variant: 'outline', className: 'rounded-lg font-bold border-[#e8ded4] text-[#71645e] hover:bg-[#faf7f2] focus-visible:ring-[#ad2d1f]' })}>
              Back to Dashboard
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/practice/session?mode=${feedback.mode}`} className={buttonVariants({ variant: 'secondary', className: 'rounded-lg font-bold bg-[#f5efe8] text-[#71645e] hover:bg-[#e8ded4] focus-visible:ring-[#ad2d1f]' })}>
                Practice Similar Questions
              </Link>
              <Link href="/practice" className={buttonVariants({ className: 'rounded-lg font-bold bg-[#ad2d1f] text-white hover:bg-[#992719] focus-visible:ring-[#ad2d1f]' })}>
                Start New Interview
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
