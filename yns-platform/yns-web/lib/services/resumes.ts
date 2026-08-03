import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { API_BASE_URL } from '@/lib/utils/api-client';
import { hasValidResumeFile } from '@/lib/validations/onboarding';

type UploadResumeStatus = 'uploading' | 'analyzing';

type UploadResumeResult = {
  success: boolean;
  fileName?: string;
  parseStatus?: 'parsed' | 'skipped' | 'failed';
  parseWarning?: string;
  error?: string;
};

type UploadResumeOptions = {
  onStatusChange?: (status: UploadResumeStatus) => void;
};

function getSafeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function formatSupabaseError(action: string, message: string) {
  return `${action}: ${message}`;
}

function shouldParseResumeFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function parseUploadedResume(file: File, resumeId: string, accessToken?: string) {
  if (!shouldParseResumeFile(file)) {
    return {
      parseStatus: 'skipped' as const,
      parseWarning: 'Resume uploaded. Automatic resume analysis currently supports PDF files only.',
    };
  }

  if (!accessToken) {
    return {
      parseStatus: 'failed' as const,
      parseWarning: 'Resume uploaded, but analysis could not start because your session was unavailable.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ resume_id: resumeId }),
    });

    if (!response.ok) {
      return {
        parseStatus: 'failed' as const,
        parseWarning: `Resume uploaded, but analysis failed with status ${response.status}.`,
      };
    }

    return { parseStatus: 'parsed' as const };
  } catch (error) {
    return {
      parseStatus: 'failed' as const,
      parseWarning: error instanceof Error ? `Resume uploaded, but analysis failed: ${error.message}` : 'Resume uploaded, but analysis failed.',
    };
  }
}

export async function uploadResume(file: File, options?: UploadResumeOptions): Promise<UploadResumeResult> {
  try {
    if (!hasValidResumeFile(file)) {
      return { success: false, error: 'Resume must be a PDF, DOC, or DOCX file.' };
    }

    options?.onStatusChange?.('uploading');

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (userError && userError.name !== 'AuthSessionMissingError') {
      return { success: false, error: userError.message };
    }

    if (!user?.id) {
      return { success: false, error: 'You must be signed in before uploading a resume.' };
    }

    const safeFileName = getSafeFileName(file.name) || 'resume';
    const storagePath = `${user.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage.from('resumes').upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) {
      return { success: false, error: formatSupabaseError('Uploading resume failed', uploadError.message) };
    }

    const { data: savedResume, error: metadataError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        extracted_text: null,
      })
      .select('id')
      .single();

    if (metadataError) {
      return { success: false, error: formatSupabaseError('Saving resume metadata failed', metadataError.message) };
    }

    if (!savedResume?.id) {
      return { success: false, error: 'Saving resume metadata failed: resumes was not updated.' };
    }

    options?.onStatusChange?.('analyzing');
    const parseResult = await parseUploadedResume(file, savedResume.id, session?.access_token);

    return { success: true, fileName: file.name, ...parseResult };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to upload resume.',
    };
  }
}
