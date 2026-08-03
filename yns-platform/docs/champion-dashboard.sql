-- Indexes for the Champion Dashboard aggregation query.
--
-- Safe to re-run. Apply against the Supabase database before the dashboard sees
-- a roster of any size; see docs/champion-dashboard.md for why each one exists.

-- Trigram support for the "Search students" box, which uses ILIKE '%term%'.
-- A btree index cannot serve a leading wildcard; a GIN trigram index can.
create extension if not exists pg_trgm;

-- The student list is defined by user_type (there is no role column).
create index if not exists app_users_user_type_idx
    on app_users (user_type);

create index if not exists app_users_name_trgm_idx
    on app_users using gin (name gin_trgm_ops);

create index if not exists app_users_email_trgm_idx
    on app_users using gin (email gin_trgm_ops);

-- "Interviews completed" and "practice time" both filter on status and
-- completed_at while grouping by user_id.
create index if not exists interview_sessions_user_status_completed_idx
    on interview_sessions (user_id, status, completed_at);

-- "Questions answered" counts turns per session inside a date window.
create index if not exists interview_turns_session_created_idx
    on interview_turns (session_id, created_at);
