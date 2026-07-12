'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowRight, CheckCircle2, FileText, Loader2 } from 'lucide-react';

import { uploadResume } from '@/lib/services/resumes';

export function NextStep() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadedFileName(null);

    const result = await uploadResume(file);

    setIsUploading(false);
    event.target.value = '';

    if (!result.success) {
      setUploadError(result.error ?? 'Unable to upload resume.');
      return;
    }

    setUploadedFileName(result.fileName ?? file.name);
    window.dispatchEvent(new Event('resume-uploaded'));
  };

  return (
    <section className="rounded-[10px] border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
      <div className="flex gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">Upload your resume</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              Upload your resume to get personalized questions based on your experience.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUploading ? 'Uploading...' : 'Upload Resume'}
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
          {uploadedFileName ? (
            <p className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Uploaded {uploadedFileName}
            </p>
          ) : null}
          {uploadError ? <p className="text-xs font-bold leading-5 text-rose-600">{uploadError}</p> : null}
        </div>
      </div>
    </section>
  );
}
