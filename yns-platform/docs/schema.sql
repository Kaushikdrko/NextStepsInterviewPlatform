-- Interview assistants phase — Phase 1 (Environment + schemas)
-- Tables for app_users, career_profiles, job_postings, resumes, onboarding_status
-- already exist from the onboarding phase and are not repeated here.
-- This file only covers the three tables the interview assistants need.

-- Job-posting-aware planner (Phase 2): job_postings already exists from the
-- onboarding phase; this adds a cache column for the parsed JobPostingFacts
-- so the planner only calls Gemini once per posting. Apply directly to Cloud SQL:
-- alter table job_postings add column if not exists parsed_facts jsonb;

create table interview_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_users(id) on delete cascade,
    session_type text not null check (session_type in ('behavioral', 'technical', 'mixed')),
    status text not null default 'in_progress'
        check (status in ('in_progress', 'completed', 'abandoned')),
    session_plan jsonb not null,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now()
);
create index on interview_sessions (user_id);

create table interview_turns (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references interview_sessions(id) on delete cascade,
    turn_index int not null,
    question jsonb not null,
    answer_text text,
    evaluation jsonb,
    created_at timestamptz not null default now(),
    unique (session_id, turn_index)
);
create index on interview_turns (session_id);

create table session_reports (
    session_id uuid primary key references interview_sessions(id) on delete cascade,
    overall int not null check (overall between 1 and 5),
    category_breakdown jsonb not null,
    strengths jsonb not null,
    growth_areas jsonb not null,
    recommended_next_steps jsonb not null,
    generated_at timestamptz not null default now()
);

create table weekly_goals (
    user_id uuid primary key references app_users(id) on delete cascade,
    target_sessions int not null default 5 check (target_sessions between 1 and 50),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
