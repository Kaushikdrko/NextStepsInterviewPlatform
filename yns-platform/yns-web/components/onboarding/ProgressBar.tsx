import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  currentTitle: string;
}

export function ProgressBar({ currentStep, totalSteps, currentTitle }: ProgressBarProps) {
  const percent = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          Step {currentStep} of {totalSteps}
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">{currentTitle}</span>
        </p>
        <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 shadow-none">
          {Math.round(percent)}% complete
        </Badge>
      </div>
      <Progress value={percent} className="h-2 bg-slate-100" />
    </div>
  );
}
