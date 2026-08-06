import { getFirebaseIdToken } from '@/lib/firebase/client';
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

type ApiUploadResumeResponse = {
  success: boolean;
  file_name?: string;
  parse_status?: 'parsed' | 'skipped' | 'failed';
  parse_warning?: string;
  error?: string;
};

export async function uploadResume(file: File, options?: UploadResumeOptions): Promise<UploadResumeResult> {
  try {
    if (!hasValidResumeFile(file)) {
      return { success: false, error: 'Resume must be a PDF, DOC, or DOCX file.' };
    }

    options?.onStatusChange?.('uploading');

    const token = await getFirebaseIdToken();
    if (!token) {
      return { success: false, error: 'You must be signed in before uploading a resume.' };
    }

    const formData = new FormData();
    formData.set('file', file);

    options?.onStatusChange?.('analyzing');

    const response = await fetch(`${API_BASE_URL}/api/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const result = (await response.json()) as ApiUploadResumeResponse;

    if (!response.ok || !result.success) {
      return { success: false, error: result.error ?? `Resume upload failed: ${response.status}` };
    }

    return {
      success: true,
      fileName: result.file_name,
      parseStatus: result.parse_status,
      parseWarning: result.parse_warning,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to upload resume.',
    };
  }
}
