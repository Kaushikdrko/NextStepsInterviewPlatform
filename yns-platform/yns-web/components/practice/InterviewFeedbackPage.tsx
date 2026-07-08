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
import { generateAssistantReport, type SessionReport } from '@/lib/services/interview-assistant';
import { getInterviewFeedbackSession, type InterviewFeedbackSession } from '@/lib/services/interview-feedback';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="flex min-h-screen items-center px-4 py-8 sm:px-6 lg:pl-[220px]">
        <Card className="mx-auto w-full max-w-md rounded-xl">
          <CardContent className="p-7 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{icon}</span>
            <h1 className="mt-5 text-2xl font-extrabold text-slate-950">{title}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
            {action ? <div className="mt-6">{action}</div> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="min-h-screen px-4 py-8 sm:px-6 lg:pl-[220px]">
        <div className="mx-auto w-full max-w-6xl space-y-5 lg:px-6">
          <div className="h-28 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-slate-500">Loading interview feedback...</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-200/70" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-slate-200/70" />
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

        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (userError || !user?.id) {
          setStatus('unauthorized');
          setMessage(userError?.message ?? 'Sign in to view this interview feedback.');
          return;
        }

        const savedFeedback = getInterviewFeedbackSession(sessionId);

        if (!savedFeedback) {
          setStatus('empty');
          setMessage('No feedback was found for this interview session.');
          return;
        }

        if (savedFeedback.userId !== user.id) {
          setStatus('unauthorized');
          setMessage('This feedback belongs to a different signed-in user.');
          return;
        }

        setFeedback(savedFeedback);
        setStatus(savedFeedback.items.length > 0 ? 'ready' : 'empty');

        if (savedFeedback.assistantSessionId && savedFeedback.items.length > 0) {
          try {
            setReportStatus('loading');
            setReportMessage('Generating full AI report...');

            const reportResponse = await generateAssistantReport(savedFeedback.assistantSessionId);

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
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Unable to load interview feedback.');
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
          <Link href="/sign-in" className={buttonVariants({ className: 'w-full rounded-lg font-bold' })}>
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
          <Link href="/practice" className={buttonVariants({ variant: 'outline', className: 'w-full rounded-lg font-bold' })}>
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
          <Link href="/practice" className={buttonVariants({ className: 'w-full rounded-lg font-bold' })}>
            Start New Interview
          </Link>
        }
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="min-h-screen px-4 py-8 sm:px-6 lg:pl-[220px]">
        <div className="mx-auto w-full max-w-6xl space-y-6 lg:px-6">
          <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
              <Link href="/practice" className="transition hover:text-slate-950">
                Interview Practice
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="text-slate-950">Feedback</span>
            </div>

            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-extrabold text-slate-950">Interview Feedback</h1>
                <p className="mt-2 text-base font-semibold leading-7 text-slate-500">
                  Review your answers and AI feedback from this session.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="border-0 bg-indigo-50 px-3 py-1 text-indigo-700">{feedback.title}</Badge>
                <Badge className="gap-2 border-0 bg-slate-100 px-3 py-1 text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDate(feedback.completedAt)}
                </Badge>
              </div>
            </div>
          </header>

          <FeedbackSummaryCard feedback={feedback} />

          {reportStatus === 'loading' ? (
            <Card className="rounded-xl border-indigo-100 bg-indigo-50/60 shadow-sm">
              <CardContent className="flex items-center gap-3 p-5 text-sm font-bold text-indigo-900">
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
              <h2 className="text-xl font-extrabold text-slate-950">Question Feedback</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">One review card per completed interview question.</p>
            </div>

            {feedback.items.map((item) => (
              <FeedbackQuestionCard key={item.questionId} item={item} />
            ))}
          </section>

          <footer className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Link href="/dashboard" className={buttonVariants({ variant: 'outline', className: 'rounded-lg font-bold' })}>
              Back to Dashboard
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/practice/session?mode=${feedback.mode}`} className={buttonVariants({ variant: 'secondary', className: 'rounded-lg font-bold' })}>
                Practice Similar Questions
              </Link>
              <Link href="/practice" className={buttonVariants({ className: 'rounded-lg font-bold' })}>
                Start New Interview
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
