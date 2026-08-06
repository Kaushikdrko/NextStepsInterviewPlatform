-- Run against the yns_interview database on yns-interview-postgres
-- (yns-interview-staging), e.g.:
--   psql "host=<instance-ip> port=5432 dbname=yns_interview user=yns_app sslmode=require" \
--     -f docs/migrations/002_signup_otp_codes.sql
--
-- Backs the custom sign-up OTP flow — see docs/migration.md Phase 3 notes
-- and yns-api/app/routers/auth_otp.py. Not applied yet as of this commit;
-- apply once DB access is available (see migration.md's open item).

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
