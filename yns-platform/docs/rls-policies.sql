-- RLS policies for the interview assistants tables.
-- app_users.id is the same uuid Supabase Auth uses (auth.users.id), so
-- auth.uid() compares directly against user_id with no lookup function.

alter table interview_sessions enable row level security;
alter table interview_turns enable row level security;
alter table session_reports enable row level security;

-- Students can only see their own sessions
create policy "sessions_own" on interview_sessions
    for all using (user_id = auth.uid());

-- Students can only see turns for their own sessions
create policy "turns_own" on interview_turns
    for all using (
        session_id in (
            select id from interview_sessions where user_id = auth.uid()
        )
    );

-- Students can only see their own reports
create policy "reports_own" on session_reports
    for all using (
        session_id in (
            select id from interview_sessions where user_id = auth.uid()
        )
    );
