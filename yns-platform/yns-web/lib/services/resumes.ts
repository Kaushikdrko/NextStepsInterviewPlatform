import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasValidResumeFile } from '@/lib/validations/onboarding';

type UploadResumeResult = {
  success: boolean;
  fileName?: string;
  error?: string;
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

export async function uploadResume(file: File): Promise<UploadResumeResult> {
  try {
    if (!hasValidResumeFile(file)) {
      return { success: false, error: 'Resume must be a PDF, DOC, or DOCX file.' };
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

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

    return { success: true, fileName: file.name };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to upload resume.',
    };
  }
}
