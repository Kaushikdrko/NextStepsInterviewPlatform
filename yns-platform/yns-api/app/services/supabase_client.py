import json
from datetime import datetime, timezone
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
    result = client.table("interview_turns").insert(turn_data).execute()
    return result.data[0]


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


def update_session_status(session_id: str, status: str) -> None:
    client = get_supabase_client()
    update_data: dict[str, Any] = {"status": status}
    if status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    client.table("interview_sessions").update(update_data).eq("id", session_id).execute()


def download_resume_bytes(user_id: str) -> tuple[str, bytes]:
    client = get_supabase_client()
    result = (
        client.table("resumes")
        .select("id, storage_path")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise ValueError(f"No resume found for user {user_id}")

    resume_id = result.data[0]["id"]
    storage_path = result.data[0]["storage_path"]
    return resume_id, client.storage.from_("resumes").download(storage_path)


def write_resume_extracted_text(resume_id: str, extracted_text: str) -> None:
    client = get_supabase_client()
    client.table("resumes").update({"extracted_text": extracted_text}).eq(
        "id", resume_id
    ).execute()
