from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import InterviewSession, InterviewTurn, SessionReport


def _session_dict(row: InterviewSession) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "session_type": row.session_type,
        "status": row.status,
        "session_plan": row.session_plan,
        "started_at": row.started_at,
        "completed_at": row.completed_at,
        "created_at": row.created_at,
    }


def _turn_dict(row: InterviewTurn) -> dict[str, Any]:
    return {
        "id": row.id,
        "session_id": row.session_id,
        "turn_index": row.turn_index,
        "question": row.question,
        "answer_text": row.answer_text,
        "evaluation": row.evaluation,
        "created_at": row.created_at,
    }


def _report_dict(row: SessionReport) -> dict[str, Any]:
    return {
        "session_id": row.session_id,
        "overall": row.overall,
        "category_breakdown": row.category_breakdown,
        "strengths": row.strengths,
        "growth_areas": row.growth_areas,
        "recommended_next_steps": row.recommended_next_steps,
        "generated_at": row.generated_at,
    }


def write_session(db: Session, session_data: dict[str, Any]) -> dict[str, Any]:
    row = InterviewSession(**session_data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _session_dict(row)


def write_turn(db: Session, turn_data: dict[str, Any]) -> dict[str, Any]:
    row = db.scalar(
        select(InterviewTurn).where(
            InterviewTurn.session_id == turn_data["session_id"],
            InterviewTurn.turn_index == turn_data["turn_index"],
        )
    )
    if row is None:
        row = InterviewTurn(**turn_data)
        db.add(row)
    else:
        row.question = turn_data["question"]
        row.answer_text = turn_data.get("answer_text")
        row.evaluation = turn_data.get("evaluation")

    db.commit()
    db.refresh(row)
    return _turn_dict(row)


def get_sessions_for_user(
    db: Session,
    user_id: str,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    statement = (
        select(InterviewSession)
        .where(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed",
        )
        .order_by(InterviewSession.created_at.desc())
    )
    if limit is not None:
        statement = statement.limit(limit)

    return [_session_dict(row) for row in db.scalars(statement).all()]


def _as_date(value: datetime | str | None) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            return None
    return None


def _score_as_percent(value: Any) -> float | None:
    if not isinstance(value, (int, float)):
        return None
    return (float(value) / 5) * 100 if value <= 5 else float(value)


def _practice_streak_days(completed_sessions: list[dict[str, Any]]) -> int:
    practiced_dates = {
        parsed
        for parsed in (_as_date(session.get("completed_at")) for session in completed_sessions)
        if parsed is not None
    }
    if not practiced_dates:
        return 0

    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    cursor = today if today in practiced_dates else yesterday if yesterday in practiced_dates else None
    if cursor is None:
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
    return start, start + timedelta(days=7)


def get_dashboard_stats_for_user(db: Session, user_id: str) -> dict[str, Any]:
    session_rows = db.scalars(
        select(InterviewSession).where(InterviewSession.user_id == user_id)
    ).all()
    completed_sessions = [
        _session_dict(session) for session in session_rows if session.status == "completed"
    ]
    session_ids = [session.id for session in session_rows]
    turns = (
        db.scalars(select(InterviewTurn).where(InterviewTurn.session_id.in_(session_ids))).all()
        if session_ids
        else []
    )
    scores = [
        score
        for score in (
            _score_as_percent((turn.evaluation or {}).get("overall")) for turn in turns
        )
        if score is not None
    ]

    return {
        "interviews_completed": len(completed_sessions),
        "questions_answered": len(turns),
        "average_feedback_score": round(sum(scores) / len(scores)) if scores else None,
        "practice_streak_days": _practice_streak_days(completed_sessions),
    }


def get_weekly_progress_for_user(db: Session, user_id: str) -> list[dict[str, Any]]:
    days = [
        {"day": day, "questions": 0}
        for day in ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
    ]
    week_start, week_end = _current_week_bounds()
    created_dates = db.scalars(
        select(InterviewTurn.created_at)
        .join(InterviewSession, InterviewSession.id == InterviewTurn.session_id)
        .where(
            InterviewSession.user_id == user_id,
            InterviewTurn.created_at >= week_start,
            InterviewTurn.created_at < week_end,
        )
    ).all()

    for created_at in created_dates:
        days[created_at.weekday()]["questions"] += 1
    return days


def _normalize_focus_area(value: str) -> str:
    return " ".join(value.strip().lower().rstrip(".!?").split())


def _format_category(value: str | None) -> str | None:
    if not value:
        return None
    labels = {
        "behavioral": "Behavioral storytelling",
        "technical": "Technical depth",
        "values": "Values alignment",
    }
    return labels.get(value, value.replace("_", " ").title())


def get_focus_area_for_user(db: Session, user_id: str) -> dict[str, Any]:
    sessions = get_sessions_for_user(db, user_id, limit=12)
    session_ids = [session["id"] for session in sessions]
    if not session_ids:
        return {
            "focus_area": None,
            "detail": "Complete an interview session to unlock a personalized focus area.",
            "supporting_category": None,
            "average_recent_score": None,
            "report_count": 0,
        }

    reports = db.scalars(
        select(SessionReport).where(SessionReport.session_id.in_(session_ids))
    ).all()
    if not reports:
        return {
            "focus_area": None,
            "detail": "Generate feedback reports after sessions to find your biggest improvement area.",
            "supporting_category": None,
            "average_recent_score": None,
            "report_count": 0,
        }

    focus_counts: Counter[str] = Counter()
    display_names: dict[str, str] = {}
    category_scores: dict[str, list[float]] = {}
    overall_scores: list[float] = []

    for report in reports:
        overall_scores.append(float(report.overall))
        for area in report.growth_areas or []:
            if not isinstance(area, str):
                continue
            normalized = _normalize_focus_area(area)
            if normalized:
                focus_counts[normalized] += 1
                display_names.setdefault(normalized, area.strip().rstrip(".!?"))

        for category in report.category_breakdown or []:
            if not isinstance(category, dict):
                continue
            name = category.get("category")
            score = category.get("score")
            if isinstance(name, str) and isinstance(score, (int, float)):
                category_scores.setdefault(name, []).append(float(score))

    focus_area = None
    if focus_counts:
        normalized_focus = focus_counts.most_common(1)[0][0]
        focus_area = display_names.get(normalized_focus, normalized_focus.title())

    supporting_category = None
    if category_scores:
        weakest_category = min(
            category_scores.items(), key=lambda item: sum(item[1]) / len(item[1])
        )[0]
        supporting_category = _format_category(weakest_category)

    average_recent_score = round(sum(overall_scores) / len(overall_scores), 1)
    if focus_area and supporting_category:
        detail = (
            f"Most reports point to {focus_area}; your lowest scoring category is "
            f"{supporting_category}."
        )
    elif focus_area:
        detail = f"Most reports point to {focus_area} as your main improvement area."
    elif supporting_category:
        detail = f"Your lowest scoring category is {supporting_category}."
    else:
        detail = "Keep completing feedback reports to identify a clearer trend."

    return {
        "focus_area": focus_area or supporting_category,
        "detail": detail,
        "supporting_category": supporting_category,
        "average_recent_score": average_recent_score,
        "report_count": len(reports),
    }


def get_session_with_plan(db: Session, session_id: str) -> dict[str, Any] | None:
    row = db.get(InterviewSession, session_id)
    return _session_dict(row) if row is not None else None


def get_turns_for_session(db: Session, session_id: str) -> list[dict[str, Any]]:
    rows = db.scalars(
        select(InterviewTurn)
        .where(InterviewTurn.session_id == session_id)
        .order_by(InterviewTurn.turn_index)
    ).all()
    return [_turn_dict(row) for row in rows]


def get_turns_for_sessions(db: Session, session_ids: list[str]) -> list[dict[str, Any]]:
    if not session_ids:
        return []
    rows = db.scalars(
        select(InterviewTurn)
        .where(InterviewTurn.session_id.in_(session_ids))
        .order_by(InterviewTurn.turn_index)
    ).all()
    return [_turn_dict(row) for row in rows]


def get_last_n_turns(
    db: Session,
    session_id: str,
    n: int = 3,
) -> list[dict[str, Any]]:
    rows = db.scalars(
        select(InterviewTurn)
        .where(InterviewTurn.session_id == session_id)
        .order_by(InterviewTurn.turn_index.desc())
        .limit(n)
    ).all()
    return [_turn_dict(row) for row in reversed(rows)]


def write_report(db: Session, report_data: dict[str, Any]) -> dict[str, Any]:
    row = db.get(SessionReport, report_data["session_id"])
    if row is None:
        row = SessionReport(**report_data)
        db.add(row)
    else:
        row.overall = report_data["overall"]
        row.category_breakdown = report_data["category_breakdown"]
        row.strengths = report_data["strengths"]
        row.growth_areas = report_data["growth_areas"]
        row.recommended_next_steps = report_data["recommended_next_steps"]
        row.generated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(row)
    return _report_dict(row)


def get_report_for_session(db: Session, session_id: str) -> dict[str, Any] | None:
    row = db.get(SessionReport, session_id)
    return _report_dict(row) if row is not None else None


def update_session_status(db: Session, session_id: str, status: str) -> None:
    row = db.get(InterviewSession, session_id)
    if row is None:
        return
    row.status = status
    if status == "completed":
        row.completed_at = datetime.now(timezone.utc)
    db.commit()
