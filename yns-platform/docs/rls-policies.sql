-- RLS policies for the interview assistants tables.
-- app_users.id is the same uuid Supabase Auth uses (auth.users.id), so
-- auth.uid() compares directly against user_id with no lookup function.

alter table interview_sessions enable row level security;
alter table interview_turns enable row level security;
alter table session_reports enable row level security;

drop policy if exists "sessions_own" on interview_sessions;
drop policy if exists "turns_own" on interview_turns;
drop policy if exists "reports_own" on session_reports;

-- Students can only see their own sessions
create policy "sessions_own" on interview_sessions
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Students can only see turns for their own sessions
create policy "turns_own" on interview_turns
    for all
    using (
        session_id in (
            select id from interview_sessions where user_id = auth.uid()
        )
    )
    with check (
        session_id in (
            select id from interview_sessions where user_id = auth.uid()
        )
    );

-- Students can only see their own reports
create policy "reports_own" on session_reports
    for all
    using (
        session_id in (
            select id from interview_sessions where user_id = auth.uid()
        )
    )
    with check (
        session_id in (
            select id from interview_sessions where user_id = auth.uid()
        )
    );

-- RLS policies for the older onboarding/profile tables that the browser still
-- reads and writes directly with the Supabase anon key.

alter table app_users enable row level security;
alter table career_profiles enable row level security;
alter table onboarding_status enable row level security;
alter table resumes enable row level security;
alter table job_postings enable row level security;

drop policy if exists "app_users_own" on app_users;
drop policy if exists "career_profiles_own" on career_profiles;
drop policy if exists "onboarding_status_own" on onboarding_status;
drop policy if exists "resumes_own" on resumes;
drop policy if exists "job_postings_own" on job_postings;

create policy "app_users_own" on app_users
    for all
    using (id = auth.uid())
    with check (id = auth.uid());

create policy "career_profiles_own" on career_profiles
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "onboarding_status_own" on onboarding_status
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "resumes_own" on resumes
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "job_postings_own" on job_postings
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Storage policies for files in the "resumes" bucket. Resume files are stored
-- at "{user_id}/{timestamp}-{filename}", so the first path segment is the owner.

drop policy if exists "resume_files_own_select" on storage.objects;
drop policy if exists "resume_files_own_insert" on storage.objects;
drop policy if exists "resume_files_own_update" on storage.objects;
drop policy if exists "resume_files_own_delete" on storage.objects;

create policy "resume_files_own_select" on storage.objects
    for select
    using (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "resume_files_own_insert" on storage.objects
    for insert
    with check (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "resume_files_own_update" on storage.objects
    for update
    using (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "resume_files_own_delete" on storage.objects
    for delete
    using (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
