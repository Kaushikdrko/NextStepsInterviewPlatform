import json
from datetime import date, datetime, timedelta, timezone
from typing import Any

from supabase import Client, create_client

from app.config import settings
from app.core.schemas.student import ResumeFacts, StudentProfile

_client: Client | None = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


def get_student_profile(user_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()

    user_row = client.table("app_users").select("*").eq("id", user_id).single().execute().data

    career_result = (
        client.table("career_profiles")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not career_result.data:
        return None
    career_row = career_result.data[0]

    resume_result = (
        client.table("resumes")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    resume_row = resume_result.data[0] if resume_result.data else None

    return {
        "user_id": user_id,
        "user_type": user_row["user_type"],
        "target_field": career_row.get("target_field"),
        "target_job_title": career_row.get("target_job_title"),
        "target_level": career_row.get("target_level"),
        "skills": career_row.get("skills") or [],
        "major": career_row.get("major"),
        "grade_level": career_row.get("grade_level"),
        "intended_major": career_row.get("intended_major"),
        "colleges_preparing_for": career_row.get("colleges_preparing_for") or [],
        "extracted_text": resume_row.get("extracted_text") if resume_row else None,
    }


def build_student_profile(raw: dict[str, Any]) -> StudentProfile:
    if raw["user_type"] == "high_school":
        target_role = raw.get("intended_major")
        interests = raw.get("colleges_preparing_for") or []
    else:
        target_role = raw.get("target_job_title") or raw.get("target_field")
        interests = raw.get("skills") or []

    resume_facts = None
    if raw.get("extracted_text"):
        resume_facts = ResumeFacts(**json.loads(raw["extracted_text"]))

    return StudentProfile(
        student_id=raw["user_id"],
        career_stage=raw["user_type"],
        target_role=target_role,
        target_level=raw.get("target_level"),
        interests=interests,
        resume_facts=resume_facts,
    )


def write_session(session_data: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    result = client.table("interview_sessions").insert(session_data).execute()
    return result.data[0]


def write_turn(turn_data: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    result = (
        client.table("interview_turns")
        .upsert(turn_data, on_conflict="session_id,turn_index")
        .execute()
    )
    return result.data[0]


def get_sessions_for_user(user_id: str, limit: int | None = None) -> list[dict[str, Any]]:
    client = get_supabase_client()
    query = (
        client.table("interview_sessions")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "completed")
        .order("created_at", desc=True)
    )

    if limit is not None:
        query = query.limit(limit)

    result = query.execute()
    return result.data


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _score_as_percent(value: Any) -> float | None:
    if not isinstance(value, (int, float)):
        return None

    if value <= 5:
        return (float(value) / 5) * 100

    return float(value)


def _practice_streak_days(completed_sessions: list[dict[str, Any]]) -> int:
    practiced_dates = {
        parsed
        for parsed in (_parse_date(session.get("completed_at")) for session in completed_sessions)
        if parsed is not None
    }
    if not practiced_dates:
        return 0

    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)

    if today in practiced_dates:
        cursor = today
    elif yesterday in practiced_dates:
        cursor = yesterday
    else:
        return 0

    streak = 0
    while cursor in practiced_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


def _current_week_bounds() -> tuple[datetime, datetime]:
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    start = datetime.combine(monday, datetime.min.time(), timezone.utc)
    end = start + timedelta(days=7)
    return start, end


def get_dashboard_stats_for_user(user_id: str) -> dict[str, Any]:
    client = get_supabase_client()
    all_sessions_result = (
        client.table("interview_sessions")
        .select("id, status, completed_at")
        .eq("user_id", user_id)
        .execute()
    )
    sessions = all_sessions_result.data or []
    completed_sessions = [session for session in sessions if session.get("status") == "completed"]
    session_ids = [session["id"] for session in sessions]

    turns: list[dict[str, Any]] = []
    if session_ids:
        turns_result = (
            client.table("interview_turns")
            .select("evaluation")
            .in_("session_id", session_ids)
            .execute()
        )
        turns = turns_result.data or []

    scores = [
        score
        for score in (_score_as_percent((turn.get("evaluation") or {}).get("overall")) for turn in turns)
        if score is not None
    ]

    return {
        "interviews_completed": len(completed_sessions),
        "questions_answered": len(turns),
        "average_feedback_score": round(sum(scores) / len(scores)) if scores else None,
        "practice_streak_days": _practice_streak_days(completed_sessions),
    }


def get_weekly_progress_for_user(user_id: str) -> list[dict[str, Any]]:
    client = get_supabase_client()
    sessions_result = (
        client.table("interview_sessions")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )
    session_ids = [session["id"] for session in (sessions_result.data or [])]

    days = [
        {"day": "Mon", "questions": 0},
        {"day": "Tue", "questions": 0},
        {"day": "Wed", "questions": 0},
        {"day": "Thu", "questions": 0},
        {"day": "Fri", "questions": 0},
        {"day": "Sat", "questions": 0},
        {"day": "Sun", "questions": 0},
    ]

    if not session_ids:
        return days

    week_start, week_end = _current_week_bounds()
    turns_result = (
        client.table("interview_turns")
        .select("created_at")
        .in_("session_id", session_ids)
        .gte("created_at", week_start.isoformat())
        .lt("created_at", week_end.isoformat())
        .execute()
    )

    for turn in turns_result.data or []:
        created_date = _parse_date(turn.get("created_at"))
        if created_date is None:
            continue

        days[created_date.weekday()]["questions"] += 1

    return days


def get_session_with_plan(session_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    result = client.table("interview_sessions").select("*").eq("id", session_id).execute()
    return result.data[0] if result.data else None


def get_turns_for_session(session_id: str) -> list[dict[str, Any]]:
    client = get_supabase_client()
    result = (
        client.table("interview_turns")
        .select("*")
        .eq("session_id", session_id)
        .order("turn_index", desc=False)
        .execute()
    )
    return result.data


def get_turns_for_sessions(session_ids: list[str]) -> list[dict[str, Any]]:
    if not session_ids:
        return []

    client = get_supabase_client()
    result = (
        client.table("interview_turns")
        .select("*")
        .in_("session_id", session_ids)
        .order("turn_index", desc=False)
        .execute()
    )
    return result.data or []


def get_last_n_turns(session_id: str, n: int = 3) -> list[dict[str, Any]]:
    client = get_supabase_client()
    result = (
        client.table("interview_turns")
        .select("*")
        .eq("session_id", session_id)
        .order("turn_index", desc=True)
        .limit(n)
        .execute()
    )
    return list(reversed(result.data))


def write_report(report_data: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    result = client.table("session_reports").upsert(report_data).execute()
    return result.data[0]


def get_report_for_session(session_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    result = client.table("session_reports").select("*").eq("session_id", session_id).execute()
    return result.data[0] if result.data else None


def update_session_status(session_id: str, status: str) -> None:
    client = get_supabase_client()
    update_data: dict[str, Any] = {"status": status}
    if status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    client.table("interview_sessions").update(update_data).eq("id", session_id).execute()


def get_latest_resume_metadata(user_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    result = (
        client.table("resumes")
        .select("id, storage_path, mime_type, file_name, extracted_text")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def download_resume_bytes(user_id: str, resume_id: str | None = None) -> tuple[dict[str, Any], bytes]:
    client = get_supabase_client()
    query = (
        client.table("resumes")
        .select("id, storage_path, mime_type, file_name, extracted_text")
        .eq("user_id", user_id)
    )

    if resume_id:
        query = query.eq("id", resume_id).limit(1)
    else:
        query = query.order("created_at", desc=True).limit(1)

    result = query.execute()
    if not result.data:
        raise ValueError("Resume not found")

    resume = result.data[0]
    return resume, client.storage.from_("resumes").download(resume["storage_path"])


def write_resume_extracted_text(resume_id: str, extracted_text: str) -> None:
    client = get_supabase_client()
    client.table("resumes").update({"extracted_text": extracted_text}).eq(
        "id", resume_id
    ).execute()
