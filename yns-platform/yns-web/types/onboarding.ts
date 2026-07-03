export type UserType = 'high_school' | 'college' | 'recent_grad';

export interface CareerProfileDraft {
  major: string;
  target_field: string;
  target_level: string;
  skills: string[];
  resume_file: File | null;
  has_job_posting: boolean;
  company: string;
  job_description: string;
}

export interface HighSchoolProfileDraft {
  grade: string;
  target_colleges: string[];
  interested_major_or_field: string;
  interview_type: string;
  activities: string;
  resume_file: File | null;
  has_specific_prompt: boolean;
  college_or_program_name: string;
  interview_description: string;
}

export interface OnboardingSubmission {
  name: string;
  user_type: UserType;
  career_profile?: CareerProfileDraft;
  high_school_profile?: HighSchoolProfileDraft;
}

export type FinalOnboardingPayload = OnboardingSubmission;

export interface OnboardingFormValues {
  name: string;
  user_type: UserType | '';
  major: string;
  target_field: string;
  target_level: string;
  skills: string;
  resume_file: File | null;
  has_job_posting: boolean | null;
  company: string;
  job_description: string;
  grade: string;
  target_colleges: string;
  interested_major_or_field: string;
  interview_type: string;
  activities: string;
  has_specific_prompt: boolean | null;
  college_or_program_name: string;
  interview_description: string;
}
