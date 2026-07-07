import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== 'AuthSessionMissingError') {
    throw new Error(error.message);
  }

  if (!user?.id) {
    throw new Error('You must be signed in to use a job posting interview.');
  }

  return user.id;
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
  const supabase = createSupabaseBrowserClient();
  const userId = await getSignedInUserId();

  const { data, error } = await supabase
    .from('job_postings')
    .select('id,company,job_title,job_description,posting_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return toDraft(data as JobPostingRow | null);
}

export async function saveCurrentJobPosting(draft: JobPostingDraft): Promise<JobPostingDraft> {
  const supabase = createSupabaseBrowserClient();
  const userId = await getSignedInUserId();
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    company: draft.company.trim() || null,
    job_title: draft.job_title.trim() || null,
    job_description: draft.job_description.trim() || null,
    posting_url: draft.posting_url.trim() || null,
    updated_at: now,
  };

  const query = draft.id
    ? supabase.from('job_postings').update(payload).eq('id', draft.id)
    : supabase.from('job_postings').insert({ ...payload, created_at: now });

  const { data, error } = await query.select('id,company,job_title,job_description,posting_url').single();

  if (error) {
    throw new Error(error.message);
  }

  return toDraft(data as JobPostingRow) as JobPostingDraft;
}
