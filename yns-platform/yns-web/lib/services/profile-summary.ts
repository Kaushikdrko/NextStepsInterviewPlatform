import { apiFetch } from '@/lib/utils/api-client';

type SummaryUser = {
  id: string;
  name?: string | null;
  email: string;
  user_type: string;
};

type CareerProfileSummary = {
  major?: string | null;
  target_field?: string | null;
  target_level?: string | null;
  interview_type?: string | null;
};

type HighSchoolProfileSummary = {
  grade?: string | null;
  colleges?: string[];
  intended_major?: string | null;
  interview_type?: string | null;
};

export type ResumeSummary = {
  id: string;
  created_at: string;
  file_name?: string | null;
  storage_path?: string | null;
  extracted_text?: string | null;
};

type JobPostingSummary = {
  company?: string | null;
  job_title?: string | null;
  job_description?: string | null;
  posting_url?: string | null;
};

export type ProfileSummaryResponse = {
  user: SummaryUser;
  profile_type: 'career' | 'high_school';
  career_profile?: CareerProfileSummary | null;
  high_school_profile?: HighSchoolProfileSummary | null;
  skills?: string[];
  resume?: ResumeSummary | null;
  job_posting?: JobPostingSummary | null;
};

export function getProfileSummary(userId: string) {
  return apiFetch<ProfileSummaryResponse>(`/api/onboarding-summary/${userId}`);
}
