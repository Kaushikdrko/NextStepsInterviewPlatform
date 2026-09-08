import { BarChart3, CheckCircle2, ListChecks, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { SessionReport } from '@/lib/services/interview-assistant';

type AssistantReportCardProps = {
  report: SessionReport;
};

function formatCategory(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function AssistantReportCard({ report }: AssistantReportCardProps) {
  return (
    <Card className="rounded-xl border-[#ead8cc] bg-white shadow-sm">
      <CardHeader className="gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-[#271f1b]">
            <BarChart3 className="h-5 w-5 text-[#ad2d1f]" aria-hidden="true" />
            Full AI Report
          </CardTitle>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#8a7c75]">
            Session-level feedback generated from all completed answers.
          </p>
        </div>
        <Badge className="shrink-0 border-0 bg-[#fff1e9] px-3 py-1 text-sm font-extrabold text-[#992719]">
          Overall {report.overall}/5
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5 p-5 pt-0">
        <div className="grid gap-3 md:grid-cols-3">
          {report.category_breakdown.map((category) => (
            <div key={category.category} className="rounded-xl border border-[#e8ded4] bg-[#faf7f2] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold text-[#271f1b]">{formatCategory(category.category)}</p>
                <Badge className="border-0 bg-white text-[#71645e]">{category.score}/5</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#71645e]">{category.notes}</p>
            </div>
          ))}
        </div>

        <Separator className="bg-[#e8ded4]" />

        <div className="grid gap-5 lg:grid-cols-3">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#271f1b]">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Strengths
            </h3>
            <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#71645e]">
              {report.strengths.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#271f1b]">
              <Target className="h-4 w-4 text-amber-500" aria-hidden="true" />
              Growth Areas
            </h3>
            <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#71645e]">
              {report.growth_areas.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#271f1b]">
              <ListChecks className="h-4 w-4 text-[#ad2d1f]" aria-hidden="true" />
              Next Steps
            </h3>
            <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#71645e]">
              {report.recommended_next_steps.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ad2d1f]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
