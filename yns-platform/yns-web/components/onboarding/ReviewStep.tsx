import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { OnboardingSubmission } from '@/types/onboarding';

interface ReviewStepProps {
  submission: OnboardingSubmission;
  onEdit: (step: number) => void;
}

const profileLabels = {
  high_school: 'High school student',
  college: 'College student',
  recent_grad: 'Recent graduate',
};

const targetLevelLabels: Record<string, string> = {
  internship: 'Internship',
  part_time: 'Part-time',
  entry_level: 'Entry-level',
  junior: 'Junior',
  mid_level: 'Mid-level',
  senior: 'Senior',
};

const interviewTypeLabels: Record<string, string> = {
  college_admissions: 'College admissions interview',
  alumni: 'Alumni interview',
  scholarship: 'Scholarship interview',
  honors_program: 'Honors program interview',
  general_practice: 'General practice',
};

function formatValue(value: string, labels: Record<string, string>) {
  return labels[value] ?? value;
}

export function ReviewStep({ submission, onEdit }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-3xl border-2 border-slate-200 shadow-none">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-6 sm:p-8">
          <CardTitle className="text-2xl font-bold text-slate-950 sm:text-3xl">Review your onboarding details</CardTitle>
          <p className="text-lg leading-7 text-slate-500">Make sure everything looks right before submitting.</p>
        </CardHeader>
        <CardContent className="space-y-8 p-6 text-slate-700 sm:p-8">
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-slate-950">General Info</h3>
              <Button type="button" variant="ghost" size="sm" className="rounded-xl text-indigo-600" onClick={() => onEdit(1)}>Edit</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Name" value={submission.name} />
              <DetailItem label="Profile" value={profileLabels[submission.user_type]} />
            </div>
          </section>

          <Separator />

          {submission.career_profile ? (
            <>
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-slate-950">Career Profile</h3>
                  <Button type="button" variant="ghost" size="sm" className="rounded-xl text-indigo-600" onClick={() => onEdit(2)}>Edit</Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Major" value={submission.career_profile.major} />
                  <DetailItem label="Target field" value={submission.career_profile.target_field} />
                  <DetailItem label="Target role level" value={formatValue(submission.career_profile.target_level, targetLevelLabels)} />
                </div>
              </section>

              <Separator />

              <section className="space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-slate-950">Skills and Resume</h3>
                  <Button type="button" variant="ghost" size="sm" className="rounded-xl text-indigo-600" onClick={() => onEdit(3)}>Edit</Button>
                </div>
                <DetailItem label="Skills" value={<BadgeList items={submission.career_profile.skills} emptyLabel="No skills provided" />} />
                <DetailItem label="Resume file" value={submission.career_profile.resume_file?.name ?? 'Not uploaded'} muted={!submission.career_profile.resume_file} />
              </section>

              <Separator />

              <section className="space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-slate-950">Job Posting</h3>
                  <Button type="button" variant="ghost" size="sm" className="rounded-xl text-indigo-600" onClick={() => onEdit(4)}>Edit</Button>
                </div>
                <DetailItem label="Has job posting" value={submission.career_profile.has_job_posting ? 'Yes' : 'No'} />
                {submission.career_profile.has_job_posting ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="Company" value={submission.career_profile.company} />
                    <DetailItem label="Posting URL" value={submission.career_profile.posting_url || 'Not added'} muted={!submission.career_profile.posting_url} />
                    <DetailItem label="Job description" value={submission.career_profile.job_description} />
                  </div>
                ) : null}
              </section>
            </>
          ) : null}

          {submission.high_school_profile ? (
            <>
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-slate-950">High School Profile</h3>
                  <Button type="button" variant="ghost" size="sm" className="rounded-xl text-indigo-600" onClick={() => onEdit(2)}>Edit</Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Grade" value={`${submission.high_school_profile.grade} grade`} />
                  <DetailItem label="Interested field" value={submission.high_school_profile.interested_major_or_field} />
                  <DetailItem label="Interview type" value={formatValue(submission.high_school_profile.interview_type, interviewTypeLabels)} />
                </div>
                <DetailItem label="Colleges" value={<BadgeList items={submission.high_school_profile.target_colleges} emptyLabel="No colleges provided" />} />
              </section>

              <Separator />

              <section className="space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-slate-950">Student Background</h3>
                  <Button type="button" variant="ghost" size="sm" className="rounded-xl text-indigo-600" onClick={() => onEdit(3)}>Edit</Button>
                </div>
                {submission.high_school_profile.activities ? (
                  <DetailItem label="Activities and experiences" value={submission.high_school_profile.activities} />
                ) : null}
                <DetailItem label="Resume file" value={submission.high_school_profile.resume_file?.name ?? 'Not uploaded'} muted={!submission.high_school_profile.resume_file} />
                <DetailItem label="Specific prompt" value={submission.high_school_profile.has_specific_prompt ? 'Yes' : 'No'} />
                {submission.high_school_profile.has_specific_prompt ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="College/program" value={submission.high_school_profile.college_or_program_name} />
                    <DetailItem label="Interview description" value={submission.high_school_profile.interview_description} />
                  </div>
                ) : null}
              </section>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className={`mt-2 text-base font-semibold leading-7 ${muted ? 'text-slate-500' : 'text-slate-950'}`}>{value}</div>
    </div>
  );
}

function BadgeList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <span className="text-slate-500">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700 shadow-none ring-1 ring-indigo-100">
          {item}
        </Badge>
      ))}
    </div>
  );
}
