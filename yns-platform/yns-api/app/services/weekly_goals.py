from datetime import datetime, timedelta, timezone
from typing import Any

from app.database import SessionLocal
from app.models import WeeklyGoal
from app.services.session_store import get_sessions_for_user

DEFAULT_TARGET_SESSIONS = 5
MIN_TARGET_SESSIONS = 1
MAX_TARGET_SESSIONS = 50


def _current_week_bounds() -> tuple[datetime, datetime]:
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    start = datetime.combine(monday, datetime.min.time(), timezone.utc)
    end = start + timedelta(days=7)
    return start, end


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def _completed_sessions_this_week(user_id: str) -> int:
    week_start, week_end = _current_week_bounds()
    completed_sessions = get_sessions_for_user(user_id)

    return sum(
        1
        for session in completed_sessions
        if (completed_at := _parse_datetime(session.get("completed_at"))) is not None
        and week_start <= completed_at < week_end
    )


def _build_response(user_id: str, target_sessions: int) -> dict[str, Any]:
    week_start, week_end = _current_week_bounds()
    completed_sessions = _completed_sessions_this_week(user_id)
    percent_complete = min(100, round((completed_sessions / target_sessions) * 100))

    return {
        "target_sessions": target_sessions,
        "completed_sessions": completed_sessions,
        "percent_complete": percent_complete,
        "week_start": week_start,
        "week_end": week_end,
    }


def get_weekly_goal_for_user(user_id: str) -> dict[str, Any]:
    with SessionLocal() as db:
        goal = db.get(WeeklyGoal, user_id)
        target_sessions = goal.target_sessions if goal is not None else DEFAULT_TARGET_SESSIONS

    return _build_response(user_id, target_sessions)


def update_weekly_goal_for_user(user_id: str, target_sessions: int) -> dict[str, Any]:
    if target_sessions < MIN_TARGET_SESSIONS or target_sessions > MAX_TARGET_SESSIONS:
        raise ValueError("Weekly goal must be between 1 and 50 sessions.")

    with SessionLocal() as db:
        goal = db.get(WeeklyGoal, user_id)
        if goal is None:
            goal = WeeklyGoal(user_id=user_id, target_sessions=target_sessions)
            db.add(goal)
        else:
            goal.target_sessions = target_sessions

        db.commit()

    return _build_response(user_id, target_sessions)
