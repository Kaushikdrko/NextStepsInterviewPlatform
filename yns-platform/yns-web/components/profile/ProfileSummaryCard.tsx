'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BriefcaseBusiness, CheckCircle2, FileText, GraduationCap, Layers3, Loader2, Target, UserRound, XCircle } from 'lucide-react';

import { getProfileSummary, type ProfileSummaryResponse } from '@/lib/services/profile-summary';
import { waitForFirebaseUser } from '@/lib/firebase/client';
import { cn } from '@/lib/utils';

const emptyValue = 'Not added';

function formatLabel(value?: string | null) {
  if (!value) return emptyValue;

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getSkills(summary: ProfileSummaryResponse | null) {
  const skills = summary?.skills;

  if (!skills || skills.length === 0) {
    return [];
  }

  return skills.flatMap((skill) => (
    typeof skill === 'string'
      ? skill.split(',').map((item) => item.trim()).filter(Boolean)
      : []
  ));
}

function hasResume(summary: ProfileSummaryResponse | null) {
  return Boolean(summary?.resume?.file_name || summary?.resume?.storage_path || summary?.resume?.extracted_text);
}

function hasJobPosting(summary: ProfileSummaryResponse | null) {
  return Boolean(
    summary?.job_posting?.company ||
      summary?.job_posting?.job_title ||
      summary?.job_posting?.job_description ||
      summary?.job_posting?.posting_url,
  );
}

type ProfileSummaryCardProps = {
  className?: string;
};

export function ProfileSummaryCard({ className }: ProfileSummaryCardProps) {
  const [summary, setSummary] = useState<ProfileSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await waitForFirebaseUser();

      if (!user?.uid) {
        throw new Error('Unable to identify the signed-in user.');
      }

      const data = await getProfileSummary(user.uid);

      setSummary(data);
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Unable to load profile summary.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfileSummary();

    window.addEventListener('resume-uploaded', loadProfileSummary);

    return () => {
      window.removeEventListener('resume-uploaded', loadProfileSummary);
    };
  }, [loadProfileSummary]);


  const profileRows = useMemo(() => {
    const careerProfile = summary?.career_profile;
    const highSchoolProfile = summary?.high_school_profile;

    return [
      { label: 'User Type', value: formatLabel(summary?.user.user_type), icon: UserRound },
      {
        label: 'Major / Intended Major',
        value: careerProfile?.major ?? highSchoolProfile?.intended_major ?? emptyValue,
        icon: GraduationCap,
      },
      { label: 'Target Field', value: careerProfile?.target_field ?? emptyValue, icon: Target },
      { label: 'Target Level', value: formatLabel(careerProfile?.target_level), icon: Layers3 },
    ];
  }, [summary]);

  const skills = useMemo(() => getSkills(summary), [summary]);
  const resumeUploaded = hasResume(summary);
  const jobPostingAdded = hasJobPosting(summary);

  return (
    <section className={cn('rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950">Profile Summary</h2>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" /> : null}
      </div>

      {error ? <p className="mt-3 text-xs font-semibold leading-5 text-rose-600">{error}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {profileRows.map((row) => (
          <div key={row.label} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <row.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-none text-slate-500">{row.label}</p>
              <p className="mt-1 text-sm font-bold leading-tight text-slate-950">{isLoading ? 'Loading...' : row.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs font-bold text-slate-500">Skills</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {isLoading ? (
            <span className="text-xs font-bold text-slate-400">Loading...</span>
          ) : skills.length > 0 ? (
            skills.map((skill) => (
              <Badge key={skill} className="border-0 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {skill}
              </Badge>
            ))
          ) : (
            <span className="text-xs font-bold text-slate-500">{emptyValue}</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm font-bold text-slate-500 md:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Resume
          </span>
          <span className={`flex items-center gap-1 ${resumeUploaded ? 'text-emerald-600' : ''}`}>
            {resumeUploaded ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
            {isLoading ? 'Loading...' : resumeUploaded ? 'Uploaded' : 'Not uploaded'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <span className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            Job Posting
          </span>
          <span className={`flex items-center gap-1 ${jobPostingAdded ? 'text-emerald-600' : ''}`}>
            {jobPostingAdded ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
            {isLoading ? 'Loading...' : jobPostingAdded ? 'Added' : 'Not added'}
          </span>
        </div>
      </div>
    </section>
  );
}
