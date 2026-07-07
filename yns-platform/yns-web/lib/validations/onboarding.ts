import { z } from 'zod';
import type { OnboardingFormValues } from '@/types/onboarding';

export const allowedResumeMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const allowedResumeExtensions = ['.pdf', '.doc', '.docx'];

export const hasValidResumeFile = (file: File | null) => {
  if (!file) return true;

  const lowerName = file.name.toLowerCase();
  const extensionMatches = allowedResumeExtensions.some((ext) => lowerName.endsWith(ext));
  const mimeMatches = allowedResumeMimeTypes.includes(file.type);

  return extensionMatches && mimeMatches;
};

export const onboardingSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.'),
    user_type: z.enum(['high_school', 'college', 'recent_grad'], {
      required_error: 'Please select who you are.',
    }),
    major: z.string().trim().default(''),
    target_field: z.string().trim().default(''),
    target_level: z.string().default(''),
    skills: z.string().trim().default(''),
    resume_file: z.custom<File | null>().nullable().default(null),
    has_job_posting: z.boolean().nullable().default(null),
    company: z.string().trim().default(''),
    posting_url: z.string().trim().default(''),
    job_description: z.string().trim().default(''),
    grade: z.string().default(''),
    target_colleges: z.string().trim().default(''),
    interested_major_or_field: z.string().trim().default(''),
    interview_type: z.string().default(''),
    activities: z.string().trim().default(''),
    has_specific_prompt: z.boolean().nullable().default(null),
    college_or_program_name: z.string().trim().default(''),
    interview_description: z.string().trim().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.user_type === 'college' || data.user_type === 'recent_grad') {
      if (!data.major.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['major'], message: 'Major is required.' });
      }

      if (!data.target_field.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_field'], message: 'Target field is required.' });
      }

      if (!data.target_level) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_level'], message: 'Please choose the role level you are preparing for.' });
      }

      if (!data.skills.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['skills'], message: 'Please add at least one skill.' });
      }

      if (data.has_job_posting === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['has_job_posting'], message: 'Please choose yes or no.' });
      }

      if (data.has_job_posting === true) {
        if (!data.company.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['company'], message: 'Company is required when practicing for a job posting.' });
        }

        if (!data.job_description.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['job_description'], message: 'Job description is required when practicing for a job posting.' });
        }
      }
    }

    if (data.user_type === 'high_school') {
      if (!data.grade) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['grade'], message: 'Please select your grade.' });
      }

      if (!data.target_colleges.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_colleges'], message: 'Please add at least one college.' });
      }

      if (!data.interested_major_or_field.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interested_major_or_field'], message: 'Please tell us your target field.' });
      }

      if (!data.interview_type) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interview_type'], message: 'Please choose the interview type.' });
      }

      if (data.has_specific_prompt === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['has_specific_prompt'], message: 'Please choose yes or no.' });
      }

      if (data.has_specific_prompt === true) {
        if (!data.college_or_program_name.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['college_or_program_name'], message: 'College or program name is required.' });
        }

        if (!data.interview_description.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interview_description'], message: 'Interview description is required.' });
        }
      }
    }

    if (data.resume_file instanceof File && !hasValidResumeFile(data.resume_file)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resume_file'],
        message: 'Resume must be a PDF, DOC, or DOCX file.',
      });
    }
  });

export const defaultValues = {
  name: '',
  user_type: '' as const,
  major: '',
  target_field: '',
  target_level: '',
  skills: '',
  resume_file: null,
  has_job_posting: null,
  company: '',
  posting_url: '',
  job_description: '',
  grade: '',
  target_colleges: '',
  interested_major_or_field: '',
  interview_type: '',
  activities: '',
  has_specific_prompt: null,
  college_or_program_name: '',
  interview_description: '',
} satisfies OnboardingFormValues;

export function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
