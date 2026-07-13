'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, Building2, CheckCircle2, ClipboardCheck, FileText, GraduationCap, Target, User, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/onboarding/FileUpload';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ReviewStep } from '@/components/onboarding/ReviewStep';
import { SearchableSelectInput } from '@/components/onboarding/SearchableSelectInput';
import { StepHeader } from '@/components/onboarding/StepHeader';
import { FIELD_OPTIONS, MAJOR_OPTIONS, MAJOR_OR_FIELD_OPTIONS } from '@/lib/onboarding-options';
import { submitOnboarding } from '@/app/actions/student';
import { defaultValues, hasValidResumeFile, onboardingSchema, splitList } from '@/lib/validations/onboarding';
import type { OnboardingFormValues, OnboardingSubmission, UserType } from '@/types/onboarding';

type FieldName = keyof OnboardingFormValues;

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [submission, setSubmission] = useState<OnboardingSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues,
  });

  const watchedUserType = form.watch('user_type');
  const watchedHasJobPosting = form.watch('has_job_posting', false);
  const watchedHasSpecificPrompt = form.watch('has_specific_prompt', false);
  const watchedValues = form.watch();

  const isCollegeFlow = watchedUserType === 'college' || watchedUserType === 'recent_grad';
  const isRecentGraduateFlow = watchedUserType === 'recent_grad';
  const totalSteps = watchedUserType === 'high_school' ? 4 : 5;

  useEffect(() => {
    if (currentStep > totalSteps) {
      setCurrentStep(totalSteps);
    }
  }, [currentStep, totalSteps]);

  const stepTitles = useMemo(() => {
    if (isCollegeFlow) {
      return [
        'General User Info',
        'Career Profile',
        'Skills and Resume',
        'Job Posting',
        'Review and Submit',
      ];
    }

    return ['General User Info', 'High School Profile', 'Student Background', 'Review and Submit'];
  }, [isCollegeFlow]);

  const getStepFields = (step: number) => {
    if (isCollegeFlow) {
      switch (step) {
        case 1:
          return ['name', 'user_type'] as const;
        case 2:
          return ['major', 'target_field', 'target_level'] as const;
        case 3:
          return ['skills', 'resume_file'] as const;
        case 4:
          return ['has_job_posting', 'company', 'job_description'] as const;
        default:
          return [] as const;
      }
    }

    switch (step) {
      case 1:
        return ['name', 'user_type'] as const;
      case 2:
        return ['grade', 'target_colleges', 'interested_major_or_field', 'interview_type'] as const;
      case 3:
        return ['activities', 'resume_file', 'has_specific_prompt', 'college_or_program_name', 'interview_description'] as const;
      default:
        return [] as const;
    }
  };

  const isCurrentStepComplete = (values: OnboardingFormValues) => {
    if (currentStep === 1) {
      return Boolean(values.name.trim()) && Boolean(values.user_type);
    }

    if (isCollegeFlow) {
      if (currentStep === 2) {
        return Boolean(values.major.trim()) && Boolean(values.target_field.trim()) && Boolean(values.target_level);
      }

      if (currentStep === 3) {
        return splitList(values.skills).length > 0 && hasValidResumeFile(values.resume_file);
      }

      if (currentStep === 4) {
        if (values.has_job_posting === null) return false;
        if (values.has_job_posting === false) return true;
        return Boolean(values.company.trim()) && Boolean(values.job_description.trim());
      }
    }

    if (!isCollegeFlow) {
      if (currentStep === 2) {
        return (
          Boolean(values.grade) &&
          splitList(values.target_colleges).length > 0 &&
          Boolean(values.interested_major_or_field.trim()) &&
          Boolean(values.interview_type)
        );
      }

      if (currentStep === 3) {
        if (!hasValidResumeFile(values.resume_file)) return false;
        if (values.has_specific_prompt === null) return false;
        if (values.has_specific_prompt === false) return true;
        return Boolean(values.college_or_program_name.trim()) && Boolean(values.interview_description.trim());
      }
    }

    return true;
  };

  const canContinue = isCurrentStepComplete(watchedValues);

  const validateCurrentStep = () => {
    const values = form.getValues();
    const currentFields = [...getStepFields(currentStep)] as FieldName[];
    const errors: Array<{ name: FieldName; message: string }> = [];

    form.clearErrors(currentFields);

    if (currentStep === 1) {
      if (!values.name.trim()) {
        errors.push({ name: 'name', message: 'Name is required.' });
      }

      if (!values.user_type) {
        errors.push({ name: 'user_type', message: 'Please select who you are.' });
      }
    }

    if (isCollegeFlow) {
      if (currentStep === 2) {
        if (!values.major.trim()) {
          errors.push({ name: 'major', message: 'Major is required.' });
        }

        if (!values.target_field.trim()) {
          errors.push({ name: 'target_field', message: 'Target field is required.' });
        }

        if (!values.target_level) {
          errors.push({ name: 'target_level', message: 'Please choose the role level you are preparing for.' });
        }
      }

      if (currentStep === 3) {
        if (splitList(values.skills).length === 0) {
          errors.push({ name: 'skills', message: 'Please add at least one skill.' });
        }

        if (!hasValidResumeFile(values.resume_file)) {
          errors.push({ name: 'resume_file', message: 'Resume must be a PDF, DOC, or DOCX file.' });
        }
      }

      if (currentStep === 4) {
        if (values.has_job_posting === null) {
          errors.push({ name: 'has_job_posting', message: 'Please choose yes or no.' });
        }

        if (values.has_job_posting === true) {
          if (!values.company.trim()) {
            errors.push({ name: 'company', message: 'Company is required when practicing for a job posting.' });
          }

          if (!values.job_description.trim()) {
            errors.push({ name: 'job_description', message: 'Job description is required when practicing for a job posting.' });
          }
        }
      }
    }

    if (!isCollegeFlow) {
      if (currentStep === 2) {
        if (!values.grade) {
          errors.push({ name: 'grade', message: 'Please select your grade.' });
        }

        if (splitList(values.target_colleges).length === 0) {
          errors.push({ name: 'target_colleges', message: 'Please add at least one college.' });
        }

        if (!values.interested_major_or_field.trim()) {
          errors.push({ name: 'interested_major_or_field', message: 'Please tell us your target field.' });
        }

        if (!values.interview_type) {
          errors.push({ name: 'interview_type', message: 'Please choose the interview type.' });
        }
      }

      if (currentStep === 3) {
        if (!hasValidResumeFile(values.resume_file)) {
          errors.push({ name: 'resume_file', message: 'Resume must be a PDF, DOC, or DOCX file.' });
        }

        if (values.has_specific_prompt === null) {
          errors.push({ name: 'has_specific_prompt', message: 'Please choose yes or no.' });
        }

        if (values.has_specific_prompt === true) {
          if (!values.college_or_program_name.trim()) {
            errors.push({ name: 'college_or_program_name', message: 'College or program name is required.' });
          }

          if (!values.interview_description.trim()) {
            errors.push({ name: 'interview_description', message: 'Interview description is required.' });
          }
        }
      }
    }

    errors.forEach((error) => {
      form.setError(error.name, { type: 'manual', message: error.message });
    });

    return errors.length === 0;
  };

  const handleNext = () => {
    setSubmitError(null);

    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setSubmitError(null);

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const buildSubmission = (values: OnboardingFormValues): OnboardingSubmission => {
    const base = {
      name: values.name.trim(),
      user_type: values.user_type as UserType,
    };

    if (values.user_type === 'high_school') {
      return {
        ...base,
        high_school_profile: {
          grade: values.grade,
          target_colleges: splitList(values.target_colleges),
          interested_major_or_field: values.interested_major_or_field.trim(),
          interview_type: values.interview_type,
          activities: values.activities.trim(),
          resume_file: values.resume_file,
          has_specific_prompt: values.has_specific_prompt === true,
          college_or_program_name: values.has_specific_prompt === true ? values.college_or_program_name.trim() : '',
          interview_description: values.has_specific_prompt === true ? values.interview_description.trim() : '',
        },
      };
    }

    return {
      ...base,
      career_profile: {
        major: values.major.trim(),
        target_field: values.target_field.trim(),
        target_level: values.target_level,
        skills: splitList(values.skills),
        resume_file: values.resume_file,
        has_job_posting: values.has_job_posting === true,
        company: values.has_job_posting === true ? values.company.trim() : '',
        posting_url: values.has_job_posting === true ? values.posting_url.trim() : '',
        job_description: values.has_job_posting === true ? values.job_description.trim() : '',
      },
    };
  };

  const buildSubmissionFormData = (submission: OnboardingSubmission) => {
    const formData = new FormData();
    const resumeFile = submission.career_profile?.resume_file ?? submission.high_school_profile?.resume_file ?? null;
    const payload: OnboardingSubmission = {
      ...submission,
      career_profile: submission.career_profile
        ? {
            ...submission.career_profile,
            resume_file: null,
          }
        : undefined,
      high_school_profile: submission.high_school_profile
        ? {
            ...submission.high_school_profile,
            resume_file: null,
          }
        : undefined,
    };

    formData.append('payload', JSON.stringify(payload));

    if (resumeFile) {
      formData.append('resume_file', resumeFile);
    }

    return formData;
  };

  const handleFinalSubmit = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const values = form.getValues();
    const finalObject = buildSubmission(values);

    setSubmitError(null);
    setIsSubmitting(true);

    const result = await submitOnboarding(buildSubmissionFormData(finalObject));

    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error ?? 'Unable to submit onboarding.');
      return;
    }

    setSubmission(finalObject);
    setCompleted(true);
    router.push('/dashboard');
  };

  if (completed && submission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-8">
        <Card className="w-full max-w-[920px] rounded-[2rem] border-slate-200 bg-white p-7 shadow-sm sm:p-10 lg:p-12">
          <CardHeader className="items-start space-y-6 p-0">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 sm:h-20 sm:w-20">
              <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true" />
            </span>
            <div className="space-y-3">
              <CardTitle className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
                Onboarding complete. Your interview practice will now be personalized.
              </CardTitle>
              <p className="max-w-3xl text-lg leading-7 text-slate-500 sm:text-xl">
                Your answers will help generate more relevant interview questions and feedback.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-10">
            <Alert className="rounded-2xl border-emerald-100 bg-emerald-50 px-5 py-4 text-base text-emerald-800">
              Your onboarding profile has been saved.
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
        <Form {...form}>
          <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
            <Card className="rounded-3xl border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
              <CardHeader className="p-0">
                <ProgressBar currentStep={currentStep} totalSteps={totalSteps} currentTitle={stepTitles[currentStep - 1] ?? 'Review'} />
              </CardHeader>

              <CardContent className="p-0 pt-6">
                <div className="space-y-6">
                  {currentStep === 1 ? (
                    <section className="space-y-6">
                      <StepHeader
                        title="What best describes you?"
                        description="This helps us tailor your interview practice experience."
                        icon={GraduationCap}
                      />

                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                        >
                          {({ field }) => (
                            <FormItem>
                              <FormLabel>What is your name?</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. Jordan Lee" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        </FormField>

                        <FormField control={form.control} name="user_type">
                          {({ field }) => (
                            <FormItem>
                              <FormLabel>Choose your profile</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  className="grid gap-3"
                                >
                                  <OptionCard id="high_school" title="High school student" description="Preparing for college interviews" icon={BookOpen} selected={field.value === 'high_school'} />
                                  <OptionCard id="college" title="College student" description="Preparing for internships or jobs" icon={GraduationCap} selected={field.value === 'college'} />
                                  <OptionCard id="recent_grad" title="Recent graduate" description="Job-ready and interview prepping" icon={BriefcaseBusiness} selected={field.value === 'recent_grad'} />
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        </FormField>
                      </div>
                    </section>
                  ) : null}

                  {currentStep === 2 && isCollegeFlow ? (
                    <section className="space-y-6">
                      <StepHeader title="Build your career profile" description="Share your academic background and the role you want to practice for." icon={Target} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={form.control} name="major">
                          {({ field }) => (
                            <FormItem>
                              <FormLabel>What is your major?</FormLabel>
                              <FormControl>
                                <SearchableSelectInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  options={MAJOR_OPTIONS}
                                  placeholder="Search or type your major"
                                />
                              </FormControl>
                              <FormDescription>You can select a suggestion or type your own.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        </FormField>
                        <FormField control={form.control} name="target_field">
                          {({ field }) => (
                            <FormItem>
                              <FormLabel>What field are you preparing for?</FormLabel>
                              <FormControl>
                                <SearchableSelectInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  options={FIELD_OPTIONS}
                                  placeholder="Search or type a field"
                                />
                              </FormControl>
                              <FormDescription>You can select a suggestion or type any field or industry.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        </FormField>
                      </div>
                      <FormField control={form.control} name="target_level">{({ field }) => (
                        <FormItem>
                          <FormLabel>What job level role are you preparing for?</FormLabel>
                          <FormControl>
                            <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3">
                              {isRecentGraduateFlow ? (
                                <>
                                  <OptionCard id="entry_level" title="Entry-level" description="Prepare for your first full-time role" icon={Target} selected={field.value === 'entry_level'} />
                                  <OptionCard id="junior" title="Junior" description="Focus on junior role interview expectations" icon={User} selected={field.value === 'junior'} />
                                  <OptionCard id="mid_level" title="Mid-level" description="Practice for roles with more ownership" icon={BriefcaseBusiness} selected={field.value === 'mid_level'} />
                                  <OptionCard id="senior" title="Senior" description="Prepare for leadership and systems-level interviews" icon={Target} selected={field.value === 'senior'} />
                                </>
                              ) : (
                                <>
                                  <OptionCard id="internship" title="Internship" description="Practice for early career internship interviews" icon={BriefcaseBusiness} selected={field.value === 'internship'} />
                                  <OptionCard id="part_time" title="Part-time" description="Prepare for part-time roles during school" icon={User} selected={field.value === 'part_time'} />
                                  <OptionCard id="entry_level" title="Entry-level" description="Prepare for your first full-time role" icon={Target} selected={field.value === 'entry_level'} />
                                </>
                              )}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}</FormField>
                    </section>
                  ) : null}

                  {currentStep === 2 && !isCollegeFlow ? (
                    <section className="space-y-6">
                      <StepHeader title="Tell us about school" description="Add your grade level, target colleges, and interview focus." icon={BookOpen} />
                      <FormField control={form.control} name="grade">{({ field }) => (
                        <FormItem>
                          <FormLabel>What grade are you in?</FormLabel>
                          <FormControl>
                            <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3">
                              <OptionCard id="9th" title="9th grade" description="First year of high school" icon={BookOpen} selected={field.value === '9th'} />
                              <OptionCard id="10th" title="10th grade" description="Sophomore year planning" icon={BookOpen} selected={field.value === '10th'} />
                              <OptionCard id="11th" title="11th grade" description="College preparation is picking up" icon={Target} selected={field.value === '11th'} />
                              <OptionCard id="12th" title="12th grade" description="Final application and interview season" icon={GraduationCap} selected={field.value === '12th'} />
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}</FormField>
                      <FormField control={form.control} name="target_colleges">{({ field }) => <FormItem><FormLabel>What colleges are you preparing interviews for?</FormLabel><FormControl><Textarea {...field} placeholder="Harvard, Stanford, UCLA, etc." /></FormControl><FormDescription>Separate multiple items with commas.</FormDescription><FormMessage /></FormItem>}</FormField>
                      <FormField control={form.control} name="interested_major_or_field">
                        {({ field }) => (
                          <FormItem>
                            <FormLabel>What major or field are you interested in?</FormLabel>
                            <FormControl>
                              <SearchableSelectInput
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                options={MAJOR_OR_FIELD_OPTIONS}
                                placeholder="Search or type a major or field"
                              />
                            </FormControl>
                            <FormDescription>You can select a suggestion or type any major, field, or area of interest.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      </FormField>
                      <FormField control={form.control} name="interview_type">{({ field }) => (
                        <FormItem>
                          <FormLabel>What type of interview are you preparing for?</FormLabel>
                          <FormControl>
                            <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3">
                              <OptionCard id="college_admissions" title="College admissions interview" description="Practice for school-specific admissions conversations" icon={GraduationCap} selected={field.value === 'college_admissions'} />
                              <OptionCard id="alumni" title="Alumni interview" description="Prepare for conversations with alumni interviewers" icon={User} selected={field.value === 'alumni'} />
                              <OptionCard id="scholarship" title="Scholarship interview" description="Practice for scholarship-focused questions" icon={Target} selected={field.value === 'scholarship'} />
                              <OptionCard id="honors_program" title="Honors program interview" description="Prepare for selective academic program interviews" icon={BookOpen} selected={field.value === 'honors_program'} />
                              <OptionCard id="general_practice" title="General practice" description="Build confidence with broad interview practice" icon={ClipboardCheck} selected={field.value === 'general_practice'} />
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}</FormField>
                    </section>
                  ) : null}

                  {currentStep === 3 && isCollegeFlow ? (
                    <section className="space-y-6">
                      <StepHeader title="Add your skills and resume" description="Share what you already know so the AI can personalize practice questions." icon={FileText} />
                      <FormField control={form.control} name="skills">{({ field }) => <FormItem><FormLabel>What skills do you currently have?</FormLabel><FormControl><Textarea {...field} placeholder="" /></FormControl><FormDescription>Separate multiple items with commas.</FormDescription><FormMessage /></FormItem>}</FormField>
                      <FileUpload control={form.control} name="resume_file" label="Upload your resume" description="Optional. Accepted file types: PDF, DOC, DOCX." />
                    </section>
                  ) : null}

                  {currentStep === 3 && !isCollegeFlow ? (
                    <section className="space-y-6">
                      <StepHeader title="Add student background" description="Share optional context and any specific prompt you want to practice." icon={User} />
                      <FormField control={form.control} name="activities">{({ field }) => <FormItem><FormLabel>What activities, clubs, or experiences do you want the AI to know about?</FormLabel><FormControl><Textarea {...field} placeholder="" /></FormControl><FormDescription>Optional context that can make practice questions more relevant.</FormDescription><FormMessage /></FormItem>}</FormField>
                      <FileUpload control={form.control} name="resume_file" label="Upload your resume" description="Optional. Accepted file types: PDF, DOC, DOCX." />
                      <FormField control={form.control} name="has_specific_prompt">{({ field }) => (
                        <FormItem>
                          <FormLabel>Do you have a specific college prompt or interview description?</FormLabel>
                          <FormControl>
                            <RadioGroup value={field.value === null ? '' : String(field.value)} onValueChange={(value) => field.onChange(value === 'true')} className="grid gap-3">
                              <OptionCard id="true" title="Yes" description="I have a prompt or description to include" icon={CheckCircle2} selected={watchedHasSpecificPrompt === true} />
                              <OptionCard id="false" title="No" description="Use my profile for general practice" icon={XCircle} selected={watchedHasSpecificPrompt === false} />
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}</FormField>
                      {watchedHasSpecificPrompt ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField control={form.control} name="college_or_program_name">{({ field }) => <FormItem><FormLabel>College or program name</FormLabel><FormControl><Input {...field} placeholder="e.g. Northwestern University" /></FormControl><FormMessage /></FormItem>}</FormField>
                          <FormField control={form.control} name="interview_description">{({ field }) => <FormItem><FormLabel>Interview description or prompt</FormLabel><FormControl><Textarea {...field} placeholder="Describe the prompt or what you want to practice." /></FormControl><FormMessage /></FormItem>}</FormField>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {currentStep === 4 && isCollegeFlow ? (
                    <section className="space-y-6">
                      <StepHeader title="Practice for a specific job?" description="Add a posting if you want the interview to focus on a real role." icon={Building2} />
                      <FormField control={form.control} name="has_job_posting">{({ field }) => (
                        <FormItem>
                          <FormLabel>Do you have a job posting you want to practice for?</FormLabel>
                          <FormControl>
                            <RadioGroup value={field.value === null ? '' : String(field.value)} onValueChange={(value) => field.onChange(value === 'true')} className="grid gap-3">
                              <OptionCard id="true" title="Yes" description="I want to tailor practice to a role" icon={CheckCircle2} selected={watchedHasJobPosting === true} />
                              <OptionCard id="false" title="No" description="Keep practice based on my profile" icon={XCircle} selected={watchedHasJobPosting === false} />
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}</FormField>

                      {watchedHasJobPosting ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField control={form.control} name="company">{({ field }) => <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} placeholder="e.g. Acme Labs" /></FormControl><FormMessage /></FormItem>}</FormField>
                          <FormField control={form.control} name="posting_url">{({ field }) => <FormItem><FormLabel>Posting URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>}</FormField>
                          <FormField control={form.control} name="job_description">{({ field }) => <FormItem className="md:col-span-2"><FormLabel>Job description</FormLabel><FormControl><Textarea {...field} placeholder="Paste the posting or a summary of responsibilities." /></FormControl><FormMessage /></FormItem>}</FormField>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {currentStep === totalSteps ? (
                    <section className="space-y-6">
                      <StepHeader title="Review and submit" description="Confirm your answers before the simulator personalizes your practice." icon={ClipboardCheck} />
                      <ReviewStep submission={buildSubmission(form.getValues())} onEdit={(step) => setCurrentStep(step)} />
                      {submitError ? (
                        <Alert className="rounded-2xl border-rose-200 bg-rose-50 px-5 py-4 text-base text-rose-700">
                          {submitError}
                        </Alert>
                      ) : null}
                    </section>
                  ) : null}

                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
                className="h-10 w-full justify-center gap-2 rounded-xl px-0 text-base font-bold text-slate-500 hover:bg-transparent hover:text-slate-700 disabled:opacity-50 sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canContinue || isSubmitting}
                  className="h-11 w-full gap-2 rounded-xl bg-indigo-500 px-6 text-base font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-600 disabled:bg-indigo-300 sm:w-auto"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="h-11 w-full gap-2 rounded-xl bg-indigo-500 px-6 text-base font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-600 sm:w-auto"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit onboarding'}
                  {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
