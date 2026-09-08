import { Lightbulb, MessageSquareText, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { SessionTurnDetail } from '@/lib/services/interview-assistant';

function getRatingClasses(rating?: number) {
  if (typeof rating !== 'number') return 'bg-[#f5efe8] text-[#71645e]';
  if (rating >= 4.5) return 'bg-emerald-50 text-emerald-700';
  if (rating >= 3.5) return 'bg-[#fff1e9] text-[#992719]';
  if (rating > 0) return 'bg-amber-50 text-amber-700';
  return 'bg-[#f5efe8] text-[#71645e]';
}

type HistoryQuestionCardProps = {
  turn: SessionTurnDetail;
};

export function HistoryQuestionCard({ turn }: HistoryQuestionCardProps) {
  const { question, answer_text: answerText, evaluation } = turn;

  return (
    <Card className="overflow-hidden rounded-xl border-[#e8ded4]">
      <CardHeader className="gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0">
          <Badge className="border-0 bg-[#f5efe8] text-[#71645e]">Question {turn.turn_index + 1}</Badge>
          <CardTitle className="mt-3 text-lg font-extrabold leading-7 text-[#271f1b]">{question.text}</CardTitle>
        </div>
        <Badge className={cn('shrink-0 border-0 px-3 py-1 text-sm font-extrabold', getRatingClasses(evaluation?.overall))}>
          {evaluation ? `${evaluation.overall}/5` : 'Not rated'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5 p-5 pt-0">
        <div className="rounded-xl border border-[#e8ded4] bg-[#faf7f2] p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#271f1b]">
            <MessageSquareText className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
            Your answer
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#71645e]">
            {answerText.trim() || 'Skipped — no answer submitted.'}
          </p>
        </div>

        {evaluation ? (
          <>
            <div className="rounded-xl border border-[#ead8cc] bg-[#fff1e9]/60 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#71382b]">
                <Sparkles className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
                Rubric breakdown
              </div>
              <ul className="mt-3 space-y-2">
                {evaluation.dimensions.map((dimension) => (
                  <li key={dimension.name} className="text-sm font-semibold leading-6 text-[#443730]">
                    <span className="font-extrabold">{dimension.name} ({dimension.score}/5):</span> {dimension.rationale}
                  </li>
                ))}
              </ul>
            </div>

            <Separator className="bg-[#e8ded4]" />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-extrabold text-[#271f1b]">Strengths</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {evaluation.notable_strengths.length > 0 ? (
                    evaluation.notable_strengths.map((strength) => (
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
                  Growth areas
                </p>
                <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#71645e]">
                  {evaluation.notable_gaps.length > 0 ? (
                    evaluation.notable_gaps.map((gap) => (
                      <li key={gap} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        <span>{gap}</span>
                      </li>
                    ))
                  ) : (
                    <span className="text-sm font-semibold text-[#8a7c75]">No growth areas recorded.</span>
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
