-- Cloud SQL schema for the yns_interview database (yns-interview-postgres
-- instance, yns-interview-staging project). This is the schema actually
-- loaded on Cloud SQL as of the Phase 1 migration work (see migration.md).
--
-- Generated from a live pg_dump --schema-only of Supabase's public schema
-- (docs/schema.sql was stale and only covered 3 of the 8 tables), then
-- adjusted for Cloud SQL:
--   1. Dropped app_users_id_fkey -> auth.users(id) — no auth schema exists
--      on Cloud SQL; app_users.id now holds the Identity Platform UID
--      directly (same UUID value, preserved from Supabase).
--   2. Dropped every RLS policy and ENABLE ROW LEVEL SECURITY statement —
--      all were keyed off auth.uid(), which doesn't exist here. Per
--      migration.md Phase 3, app/dependencies.py's require_* checks are
--      now the sole authorization layer (RLS is not being replicated).
-- Everything else (columns, constraints, indexes, triggers) is unchanged
-- from what was live in Supabase at migration time.

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE TABLE public.app_users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text,
    user_type text NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_users_user_type_check CHECK ((user_type = ANY (ARRAY['high_school'::text, 'college_student'::text, 'recent_graduate'::text])))
);

CREATE TABLE public.career_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    target_field text,
    interview_type text,
    skills text[] DEFAULT '{}'::text[],
    major text,
    target_level text,
    target_job_title text,
    grade_level text,
    intended_major text,
    colleges_preparing_for text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT career_profiles_target_level_check CHECK (((target_level IS NULL) OR (target_level = ANY (ARRAY['internship'::text, 'entry_level'::text, 'junior'::text, 'mid_level'::text, 'senior'::text]))))
);

CREATE TABLE public.interview_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_type text NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    session_plan jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_sessions_session_type_check CHECK ((session_type = ANY (ARRAY['behavioral'::text, 'technical'::text, 'mixed'::text]))),
    CONSTRAINT interview_sessions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])))
);

CREATE TABLE public.interview_turns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    turn_index integer NOT NULL,
    question jsonb NOT NULL,
    answer_text text,
    evaluation jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.job_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company text,
    job_title text,
    job_description text,
    posting_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parsed_facts jsonb
);

CREATE TABLE public.onboarding_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_step text DEFAULT 'start'::text NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.resumes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    mime_type text,
    file_size integer,
    extracted_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.session_reports (
    session_id uuid NOT NULL,
    overall integer NOT NULL,
    category_breakdown jsonb NOT NULL,
    strengths jsonb NOT NULL,
    growth_areas jsonb NOT NULL,
    recommended_next_steps jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT session_reports_overall_check CHECK (((overall >= 1) AND (overall <= 5)))
);

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_email_key UNIQUE (email);

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.career_profiles
    ADD CONSTRAINT career_profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.career_profiles
    ADD CONSTRAINT career_profiles_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.interview_turns
    ADD CONSTRAINT interview_turns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.interview_turns
    ADD CONSTRAINT interview_turns_session_id_turn_index_key UNIQUE (session_id, turn_index);

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.onboarding_status
    ADD CONSTRAINT onboarding_status_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.onboarding_status
    ADD CONSTRAINT onboarding_status_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.session_reports
    ADD CONSTRAINT session_reports_pkey PRIMARY KEY (session_id);

CREATE INDEX interview_sessions_user_id_idx ON public.interview_sessions USING btree (user_id);

CREATE INDEX interview_turns_session_id_idx ON public.interview_turns USING btree (session_id);

CREATE TRIGGER set_app_users_updated_at BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_career_profiles_updated_at BEFORE UPDATE ON public.career_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_onboarding_status_updated_at BEFORE UPDATE ON public.onboarding_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Note: app_users_id_fkey -> auth.users(id) intentionally omitted (see header).

ALTER TABLE ONLY public.career_profiles
    ADD CONSTRAINT career_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.interview_turns
    ADD CONSTRAINT interview_turns_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.onboarding_status
    ADD CONSTRAINT onboarding_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.session_reports
    ADD CONSTRAINT session_reports_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE;

-- No RLS/policies below (all referenced auth.uid(), which doesn't exist on
-- Cloud SQL). Authorization is enforced entirely by app/dependencies.py's
-- require_* checks after this migration (see migration.md Phase 3).

-- Added in Phase 3 (not part of the original Supabase schema) — backs the
-- custom sign-up OTP flow (yns-api/app/routers/auth_otp.py) since Firebase
-- Auth has no built-in "type a 6-digit code" verification step. See
-- docs/migrations/002_signup_otp_codes.sql and migration.md Phase 3 notes.
CREATE TABLE public.signup_otp_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.signup_otp_codes
    ADD CONSTRAINT signup_otp_codes_pkey PRIMARY KEY (id);

CREATE INDEX signup_otp_codes_email_idx ON public.signup_otp_codes USING btree (email);

-- Added for persisted dashboard goals.
CREATE TABLE public.weekly_goals (
    user_id uuid NOT NULL,
    target_sessions integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT weekly_goals_target_sessions_check
        CHECK (((target_sessions >= 1) AND (target_sessions <= 50)))
);

ALTER TABLE ONLY public.weekly_goals
    ADD CONSTRAINT weekly_goals_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.weekly_goals
    ADD CONSTRAINT weekly_goals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

-- Added for authenticated, non-streaming Google Cloud Speech-to-Text jobs.
-- Raw audio is stored only in the private, short-lived GCS bucket.
CREATE TABLE public.speech_transcription_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid NOT NULL,
    storage_path text NOT NULL,
    operation_name text,
    status text DEFAULT 'pending'::text NOT NULL,
    transcript text,
    error_message text,
    audio_size_bytes bigint NOT NULL,
    audio_duration_ms bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT speech_transcription_jobs_status_check
        CHECK (status = ANY (ARRAY[
            'pending'::text,
            'processing'::text,
            'completed'::text,
            'failed'::text,
            'cancelled'::text
        ])),
    CONSTRAINT speech_transcription_jobs_audio_size_check
        CHECK (audio_size_bytes > 0 AND audio_size_bytes <= 26214400),
    CONSTRAINT speech_transcription_jobs_audio_duration_check
        CHECK (audio_duration_ms > 0 AND audio_duration_ms <= 300000)
);

ALTER TABLE ONLY public.speech_transcription_jobs
    ADD CONSTRAINT speech_transcription_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.speech_transcription_jobs
    ADD CONSTRAINT speech_transcription_jobs_storage_path_key UNIQUE (storage_path);

ALTER TABLE ONLY public.speech_transcription_jobs
    ADD CONSTRAINT speech_transcription_jobs_operation_name_key UNIQUE (operation_name);

ALTER TABLE ONLY public.speech_transcription_jobs
    ADD CONSTRAINT speech_transcription_jobs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.speech_transcription_jobs
    ADD CONSTRAINT speech_transcription_jobs_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE;

CREATE INDEX speech_transcription_jobs_user_session_idx
    ON public.speech_transcription_jobs USING btree (user_id, session_id);

CREATE INDEX speech_transcription_jobs_status_expires_idx
    ON public.speech_transcription_jobs USING btree (status, expires_at);
