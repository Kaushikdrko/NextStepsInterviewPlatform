import { getFirebaseIdToken } from '@/lib/firebase/client';
import { API_BASE_URL } from '@/lib/utils/api-client';

export type TranscriptionJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TranscriptionJob = {
  jobId: string;
  status: TranscriptionJobStatus;
  transcript: string | null;
  error: string | null;
  expiresAt: string;
};

type ApiTranscriptionJob = {
  job_id: string;
  status: TranscriptionJobStatus;
  transcript: string | null;
  error: string | null;
  expires_at: string;
};

type RequestOptions = {
  signal?: AbortSignal;
};

function toTranscriptionJob(job: ApiTranscriptionJob): TranscriptionJob {
  return {
    jobId: job.job_id,
    status: job.status,
    transcript: job.transcript,
    error: job.error,
    expiresAt: job.expires_at,
  };
}

async function getAccessToken(): Promise<string> {
  const token = await getFirebaseIdToken();
  if (!token) {
    throw new Error('You must be signed in to transcribe an answer.');
  }
  return token;
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = (await response.json()) as { detail?: string; error?: string };
    return new Error(body.detail ?? body.error ?? fallback);
  } catch {
    return new Error(fallback);
  }
}

function transcriptionPath(sessionId: string, jobId?: string): string {
  const base = `/api/sessions/${encodeURIComponent(sessionId)}/transcriptions`;
  return jobId ? `${base}/${encodeURIComponent(jobId)}` : base;
}

export async function uploadSpeechRecording(
  sessionId: string,
  recording: Blob,
  options?: RequestOptions,
): Promise<TranscriptionJob> {
  if (recording.size === 0) {
    throw new Error('The recording is empty.');
  }

  const token = await getAccessToken();
  const formData = new FormData();
  formData.set('file', recording, 'answer.wav');

  const response = await fetch(`${API_BASE_URL}${transcriptionPath(sessionId)}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    signal: options?.signal,
  });

  if (!response.ok) {
    throw await responseError(
      response,
      `Unable to upload recording (${response.status}).`,
    );
  }

  return toTranscriptionJob((await response.json()) as ApiTranscriptionJob);
}

export async function getSpeechTranscription(
  sessionId: string,
  jobId: string,
  options?: RequestOptions,
): Promise<TranscriptionJob> {
  const token = await getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}${transcriptionPath(sessionId, jobId)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    throw await responseError(
      response,
      `Unable to check transcription (${response.status}).`,
    );
  }

  return toTranscriptionJob((await response.json()) as ApiTranscriptionJob);
}

export async function cancelSpeechTranscription(
  sessionId: string,
  jobId: string,
  options?: RequestOptions,
): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}${transcriptionPath(sessionId, jobId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    throw await responseError(
      response,
      `Unable to cancel transcription (${response.status}).`,
    );
  }
}
