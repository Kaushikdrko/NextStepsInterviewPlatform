'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Clock, FileText, GraduationCap, Layers3, Loader2, Sparkles } from 'lucide-react';

import { getProfileSummary, type ProfileSummaryResponse, type ResumeSummary } from '@/lib/services/profile-summary';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type ResumeFacts = {
  raw_text?: string | null;
  experiences?: string[] | null;
  skills?: string[] | null;
  education?: string[] | null;
};

function parseResumeFacts(resume: ResumeSummary | null | undefined): ResumeFacts | null {
  if (!resume?.extracted_text) return null;

  try {
    const parsed = JSON.parse(resume.extracted_text) as ResumeFacts;
    return parsed;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

type ResumeCardProps = {
  className?: string;
};

export function ResumeCard({ className }: ResumeCardProps) {
  const [summary, setSummary] = useState<ProfileSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        throw new Error(userError?.message ?? 'Unable to identify the signed-in user.');
      }

      const data = await getProfileSummary(user.id);
      setSummary(data);
    } catch (summaryError) {
      setError(summaryError instanceof Error ? summaryError.message : 'Unable to load resume.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();

    window.addEventListener('resume-uploaded', loadSummary);

    return () => {
      window.removeEventListener('resume-uploaded', loadSummary);
    };
  }, [loadSummary]);

  const resume = summary?.resume ?? null;
  const facts = useMemo(() => parseResumeFacts(resume), [resume]);
  const uploadedOn = formatDate(resume?.created_at);

  return (
    <section id="resume" className={cn('scroll-mt-6 rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950">Resume</h2>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" /> : null}
      </div>

      {error ? <p className="mt-3 text-xs font-semibold leading-5 text-rose-600">{error}</p> : null}

      {!isLoading && !error && !resume ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-slate-950">No resume uploaded yet</p>
          <p className="max-w-xs text-xs font-semibold text-slate-500">
            Upload your resume from the panel on the right to see your experience, education, and skills here.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && resume ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-950">{resume.file_name ?? 'Resume'}</p>
              {uploadedOn ? (
                <p className="flex items-center gap-1 text-xs font-bold text-slate-500">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Uploaded {uploadedOn}
                </p>
              ) : null}
            </div>
          </div>

          {!facts ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs font-bold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Still processing your resume — check back in a moment.
            </div>
          ) : (
            <>
              <ResumeSection title="Experience" icon={Briefcase} items={facts.experiences} />
              <ResumeSection title="Education" icon={GraduationCap} items={facts.education} />

              <div className="border-t border-slate-200 pt-4">
                <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {facts.skills && facts.skills.length > 0 ? (
                    facts.skills.map((skill) => (
                      <Badge key={skill} className="border-0 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs font-bold text-slate-500">No skills extracted</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

type ResumeSectionProps = {
  title: string;
  icon: typeof Sparkles;
  items?: string[] | null;
};

function ResumeSection({ title, icon: Icon, items }: ResumeSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
      <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm font-semibold leading-6 text-slate-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
