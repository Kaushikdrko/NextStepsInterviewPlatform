import { Lightbulb, MessageSquareText, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { InterviewFeedbackItem } from '@/lib/services/interview-assistant';

function getScoreClasses(score?: number) {
  if (typeof score !== 'number') return 'bg-[#f5efe8] text-[#71645e]';
  if (score >= 85) return 'bg-emerald-50 text-emerald-700';
  if (score >= 70) return 'bg-[#fff1e9] text-[#992719]';
  if (score > 0) return 'bg-amber-50 text-amber-700';
  return 'bg-[#f5efe8] text-[#71645e]';
}

type FeedbackQuestionCardProps = {
  item: InterviewFeedbackItem;
};

export function FeedbackQuestionCard({ item }: FeedbackQuestionCardProps) {
  const wasScored = typeof item.score === 'number';

  return (
    <Card className="overflow-hidden rounded-xl border-[#e8ded4]">
      <CardHeader className="gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0">
          <Badge className="border-0 bg-[#f5efe8] text-[#71645e]">Question {item.questionNumber}</Badge>
          <CardTitle className="mt-3 text-lg font-extrabold leading-7 text-[#271f1b]">{item.questionText}</CardTitle>
        </div>
        <Badge className={cn('shrink-0 border-0 px-3 py-1 text-sm font-extrabold', getScoreClasses(item.score))}>
          {typeof item.score === 'number' ? `${item.score}%` : 'Not scored'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5 p-5 pt-0">
        <div className="rounded-xl border border-[#e8ded4] bg-[#faf7f2] p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#271f1b]">
            <MessageSquareText className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
            Your answer
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#71645e]">
            {item.userAnswer.trim() || 'No answer submitted.'}
          </p>
        </div>

        {wasScored ? (
          <>
            <div className="rounded-xl border border-[#ead8cc] bg-[#fff1e9]/60 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#71382b]">
                <Sparkles className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
                AI feedback
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#443730]">{item.aiFeedback}</p>
            </div>

            <Separator className="bg-[#e8ded4]" />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-extrabold text-[#271f1b]">Strengths</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.strengths.length > 0 ? (
                    item.strengths.map((strength) => (
                      <Badge key={strength} className="border-0 bg-emerald-50 text-emerald-700">
                        {strength}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm font-semibold text-[#8a7c75]">No notable strengths recorded.</span>
                  )}
                </div>
              </div>

              <div>
                <p className="flex items-center gap-2 text-sm font-extrabold text-[#271f1b]">
                  <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  Improvement tips
                </p>
                <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#71645e]">
                  {item.improvements.map((improvement) => (
                    <li key={improvement} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm font-semibold text-[#8a7c75]">
            Skipped questions are not scored and do not affect your feedback report.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
