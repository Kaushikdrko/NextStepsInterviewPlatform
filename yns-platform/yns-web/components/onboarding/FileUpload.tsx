import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { FileText, UploadCloud } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FileUploadProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
}

export function FileUpload<TFieldValues extends FieldValues>({ control, name, label, description }: FileUploadProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  const selectedFile = field.value as File | null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm font-bold text-slate-900">{label}</Label>
        {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      <Label
        className={cn(
          'flex min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-center transition-all hover:border-indigo-300 hover:bg-indigo-50/50',
          fieldState.error && 'border-rose-300 bg-rose-50/70',
        )}
      >
        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
          <UploadCloud className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-base font-bold text-slate-900">Choose a resume file</span>
        <span className="mt-1 text-xs text-slate-500">PDF, DOC, or DOCX. The file stays in your browser for now.</span>
        <Input
          type="file"
          className="sr-only"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            field.onChange(file);
          }}
        />
      </Label>
      {selectedFile ? (
        <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <FileText className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <span className="min-w-0 truncate">{selectedFile.name}</span>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No resume selected. This step is optional.</p>
      )}
      {fieldState.error ? <p className="text-sm font-semibold text-rose-600">{fieldState.error.message}</p> : null}
    </div>
  );
}
