import { waitForFirebaseUser } from '@/lib/firebase/client';
import { apiFetch } from '@/lib/utils/api-client';

export type JobPostingDraft = {
  id?: string;
  company: string;
  job_title: string;
  job_description: string;
  posting_url: string;
};

type JobPostingRow = {
  id: string;
  company: string | null;
  job_title: string | null;
  job_description: string | null;
  posting_url: string | null;
};

async function getSignedInUserId() {
  const user = await waitForFirebaseUser();

  if (!user?.uid) {
    throw new Error('You must be signed in to use a job posting interview.');
  }

  return user.uid;
}

function toDraft(row: JobPostingRow | null): JobPostingDraft | null {
  if (!row) return null;

  return {
    id: row.id,
    company: row.company ?? '',
    job_title: row.job_title ?? '',
    job_description: row.job_description ?? '',
    posting_url: row.posting_url ?? '',
  };
}

export async function getCurrentJobPosting(): Promise<JobPostingDraft | null> {
  const userId = await getSignedInUserId();

  try {
    const data = await apiFetch<JobPostingRow>(`/api/job-postings/user/${userId}`);
    return toDraft(data);
  } catch {
    return null;
  }
}

export async function saveCurrentJobPosting(draft: JobPostingDraft): Promise<JobPostingDraft> {
  await getSignedInUserId();

  const data = await apiFetch<JobPostingRow>('/api/job-postings', {
    method: 'POST',
    body: JSON.stringify({
      company: draft.company.trim(),
      job_title: draft.job_title.trim(),
      job_description: draft.job_description.trim(),
      posting_url: draft.posting_url.trim(),
    }),
  });

  return toDraft(data) as JobPostingDraft;
}

export function importJobPosting(url: string) {
  return apiFetch<JobPostingDraft>('/api/job-postings/import', {
    method: 'POST',
    body: JSON.stringify({ url: url.trim() }),
  });
}
