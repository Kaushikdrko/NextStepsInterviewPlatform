import { BarChart3, CheckCircle2, Clock3, Target, Trophy } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import type { InterviewFeedbackSession } from '@/lib/services/interview-assistant';

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type FeedbackSummaryCardProps = {
  feedback: InterviewFeedbackSession;
};

export function FeedbackSummaryCard({ feedback }: FeedbackSummaryCardProps) {
  const stats = [
    {
      label: 'Answered',
      value: `${feedback.answeredQuestions}/${feedback.totalQuestions}`,
      icon: CheckCircle2,
    },
    {
      label: 'Average score',
      value: typeof feedback.averageScore === 'number' ? `${feedback.averageScore}%` : 'N/A',
      icon: BarChart3,
    },
    {
      label: 'Total time',
      value: formatTime(feedback.totalTimeSeconds),
      icon: Clock3,
    },
    {
      label: 'Strongest area',
      value: feedback.strongestArea ?? 'Not enough data',
      icon: Trophy,
    },
    {
      label: 'Improve next',
      value: feedback.mainImprovementArea ?? 'Submit more answers',
      icon: Target,
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-xl border-[#e8ded4]">
          <CardContent className="flex h-full gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff1e9] text-[#ad2d1f]">
              <stat.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-[#a3958b]">{stat.label}</p>
              <p className="mt-1 text-sm font-extrabold leading-5 text-[#271f1b]">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
