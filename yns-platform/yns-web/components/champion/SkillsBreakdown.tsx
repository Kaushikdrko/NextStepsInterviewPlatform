import { SKILL_BAR_CLASSES } from '@/lib/champion/helpers';
import type { SkillScore } from '@/lib/champion/types';
import { SkillStatusBadge } from '@/components/champion/StatusBadges';

export function SkillsBreakdown({ skills }: { skills: SkillScore[] }) {
  if (skills.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm font-semibold text-slate-500">
        No skill data yet. Skills populate after the student completes interviews.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {skills.map((skill) => (
        <div key={skill.skill}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-800">{skill.skill}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-950">{skill.score}%</span>
              <SkillStatusBadge status={skill.status} />
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${SKILL_BAR_CLASSES[skill.status]}`} style={{ width: `${skill.score}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-slate-500">{skill.recommendation}</p>
        </div>
      ))}
    </div>
  );
}
