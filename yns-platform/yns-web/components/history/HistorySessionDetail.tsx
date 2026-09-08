'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarDays, ChevronRight, ListChecks, Loader2, RefreshCw } from 'lucide-react';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { AssistantReportCard } from '@/components/practice/AssistantReportCard';
import { HistoryQuestionCard } from '@/components/history/HistoryQuestionCard';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  generateAssistantReport,
  getAssistantReport,
  getSessionDetail,
  type SessionDetailResponse,
  type SessionReport,
} from '@/lib/services/interview-assistant';

type PageStatus = 'loading' | 'ready' | 'error';

type HistorySessionDetailProps = {
  sessionId: string;
};

function formatSessionType(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function DetailState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
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
            <p className="mt-4 text-sm font-bold text-[#8a7c75]">Loading session history...</p>
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-[#e8ded4]/70" />
        </div>
      </div>
    </main>
  );
}

export function HistorySessionDetail({ sessionId }: HistorySessionDetailProps) {
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState('');
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [reportMessage, setReportMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setStatus('loading');
        setMessage('');
        setReportStatus('idle');
        setReportMessage('');

        const detail = await getSessionDetail(sessionId);
        if (!isMounted) return;

        setSession(detail);
        setStatus('ready');

        if (detail.turns.length > 0) {
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

            setReport(reportResponse.report);
            setReportStatus('ready');
            setReportMessage('');
          } catch (reportError) {
            if (isMounted) {
              setReport(null);
              setReportStatus('error');
              setReportMessage(reportError instanceof Error ? reportError.message : 'Unable to generate the full AI report.');
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Unable to load this interview session.');
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'error' || !session) {
    return (
      <DetailState
        icon={<AlertCircle className="h-6 w-6" aria-hidden="true" />}
        title="Session could not load"
        description={message || 'Unable to load this interview session.'}
        action={
          <Link href="/history" className={buttonVariants({ variant: 'outline', className: 'w-full rounded-lg font-bold border-[#e8ded4] text-[#71645e] hover:bg-[#faf7f2] focus-visible:ring-[#ad2d1f]' })}>
            Back to History
          </Link>
        }
      />
    );
  }

  if (session.turns.length === 0) {
    return (
      <DetailState
        icon={<RefreshCw className="h-6 w-6" aria-hidden="true" />}
        title="No answers recorded"
        description="This session doesn't have any recorded questions yet."
        action={
          <Link href="/history" className={buttonVariants({ className: 'w-full rounded-lg font-bold bg-[#ad2d1f] text-white hover:bg-[#992719] focus-visible:ring-[#ad2d1f]' })}>
            Back to History
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
              <Link href="/history" className="text-[#ad2d1f] transition hover:text-[#992719]">
                History
              </Link>
              <ChevronRight className="h-4 w-4 text-[#a3958b]" aria-hidden="true" />
              <span className="text-[#271f1b]">{formatSessionType(session.session_type)} Interview</span>
            </div>

            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="break-words text-2xl font-extrabold text-[#271f1b] sm:text-3xl">{formatSessionType(session.session_type)} Interview</h1>
                <p className="mt-2 text-base font-semibold leading-7 text-[#8a7c75]">
                  Review your answers and ratings from this session.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {formatDate(session.completed_at) ? (
                  <Badge className="gap-2 border-0 bg-[#f5efe8] px-3 py-1 text-[#71645e]">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(session.completed_at)}
                  </Badge>
                ) : null}
                <Badge className="gap-2 border-0 bg-[#fff1e9] px-3 py-1 text-[#992719]">
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                  {session.turns.length} question{session.turns.length === 1 ? '' : 's'}
                </Badge>
              </div>
            </div>
          </header>

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

          {report ? <AssistantReportCard report={report} /> : null}

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#271f1b]">Question by Question</h2>
              <p className="mt-1 text-sm font-semibold text-[#8a7c75]">One review card per question in this session.</p>
            </div>

            {session.turns.map((turn) => (
              <HistoryQuestionCard key={turn.turn_index} turn={turn} />
            ))}
          </section>

          <footer className="flex flex-col gap-3 rounded-xl border border-[#e8ded4] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Link href="/history" className={buttonVariants({ variant: 'outline', className: 'rounded-lg font-bold border-[#e8ded4] text-[#71645e] hover:bg-[#faf7f2] focus-visible:ring-[#ad2d1f]' })}>
              Back to History
            </Link>
            <Link href="/practice" className={buttonVariants({ className: 'rounded-lg font-bold bg-[#ad2d1f] text-white hover:bg-[#992719] focus-visible:ring-[#ad2d1f]' })}>
              Start New Interview
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
