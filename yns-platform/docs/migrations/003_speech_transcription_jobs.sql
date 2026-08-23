-- Persistent state for authenticated, non-streaming Speech-to-Text jobs.
-- Audio bytes remain in the private voice-temp GCS bucket and are deleted by
-- application cleanup or the bucket's one-day lifecycle policy.

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
