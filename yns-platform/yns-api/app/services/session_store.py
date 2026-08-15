from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.database import SessionLocal
from app.models import InterviewSession, InterviewTurn, SessionReport

"""SQLAlchemy/Cloud SQL access for interview_sessions/interview_turns/
session_reports. Mirrors the call signatures the old supabase_client.py
versions had (same dict-return shape), so sessions/router.py and
reports/router.py only needed an import swap. These tables now live on
Cloud SQL alongside app_users — see docs/migration.md.
"""


def _session_to_dict(session: InterviewSession) -> dict[str, Any]:
    return {
        "id": session.id,
        "user_id": session.user_id,
        "session_type": session.session_type,
        "status": session.status,
        "session_plan": session.session_plan,
        "started_at": session.started_at,
        "completed_at": session.completed_at,
        "created_at": session.created_at,
    }


def _turn_to_dict(turn: InterviewTurn) -> dict[str, Any]:
    return {
        "id": turn.id,
        "session_id": turn.session_id,
        "turn_index": turn.turn_index,
        "question": turn.question,
        "answer_text": turn.answer_text,
        "evaluation": turn.evaluation,
        "created_at": turn.created_at,
    }


def _report_to_dict(report: SessionReport) -> dict[str, Any]:
    return {
        "session_id": report.session_id,
        "overall": report.overall,
        "category_breakdown": report.category_breakdown,
        "strengths": report.strengths,
        "growth_areas": report.growth_areas,
        "recommended_next_steps": report.recommended_next_steps,
        "generated_at": report.generated_at,
    }


def write_session(session_data: dict[str, Any]) -> dict[str, Any]:
    with SessionLocal() as db:
        now = datetime.now(timezone.utc)
        session = InterviewSession(
            user_id=session_data["user_id"],
            session_type=session_data["session_type"],
            status=session_data["status"],
            session_plan=session_data["session_plan"],
            started_at=now,
            created_at=now,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return _session_to_dict(session)


def write_turn(turn_data: dict[str, Any]) -> dict[str, Any]:
    with SessionLocal() as db:
        turn = (
            db.query(InterviewTurn)
            .filter(
                InterviewTurn.session_id == turn_data["session_id"],
                InterviewTurn.turn_index == turn_data["turn_index"],
            )
            .first()
        )

        if turn is None:
            turn = InterviewTurn(
                session_id=turn_data["session_id"],
                turn_index=turn_data["turn_index"],
                created_at=datetime.now(timezone.utc),
            )
            db.add(turn)

        turn.question = turn_data["question"]
        turn.answer_text = turn_data["answer_text"]
        turn.evaluation = turn_data["evaluation"]

        db.commit()
        db.refresh(turn)
        return _turn_to_dict(turn)


def get_sessions_for_user(user_id: str, limit: int | None = None) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        query = (
            db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id, InterviewSession.status == "completed")
            .order_by(InterviewSession.created_at.desc())
        )
        if limit is not None:
            query = query.limit(limit)
        return [_session_to_dict(s) for s in query.all()]


def _parse_date(value: Any) -> date | None:
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
    with SessionLocal() as db:
        sessions = (
            db.query(InterviewSession).filter(InterviewSession.user_id == user_id).all()
        )
        completed_sessions = [_session_to_dict(s) for s in sessions if s.status == "completed"]
        session_ids = [s.id for s in sessions]

        turns: list[InterviewTurn] = []
        if session_ids:
            turns = (
                db.query(InterviewTurn).filter(InterviewTurn.session_id.in_(session_ids)).all()
            )

    scores = [
        score
        for score in (_score_as_percent((t.evaluation or {}).get("overall")) for t in turns)
        if score is not None
    ]

    return {
        "interviews_completed": len(completed_sessions),
        "questions_answered": len(turns),
        "average_feedback_score": round(sum(scores) / len(scores)) if scores else None,
        "practice_streak_days": _practice_streak_days(completed_sessions),
    }


def get_weekly_progress_for_user(user_id: str) -> list[dict[str, Any]]:
    days = [
        {"day": "Mon", "questions": 0},
        {"day": "Tue", "questions": 0},
        {"day": "Wed", "questions": 0},
        {"day": "Thu", "questions": 0},
        {"day": "Fri", "questions": 0},
        {"day": "Sat", "questions": 0},
        {"day": "Sun", "questions": 0},
    ]

    with SessionLocal() as db:
        session_ids = [
            row[0]
            for row in db.query(InterviewSession.id)
            .filter(InterviewSession.user_id == user_id)
            .all()
        ]

        if not session_ids:
            return days

        week_start, week_end = _current_week_bounds()
        turns = (
            db.query(InterviewTurn.created_at)
            .filter(
                InterviewTurn.session_id.in_(session_ids),
                InterviewTurn.created_at >= week_start,
                InterviewTurn.created_at < week_end,
            )
            .all()
        )

    for (created_at,) in turns:
        created_date = _parse_date(created_at)
        if created_date is None:
            continue
        days[created_date.weekday()]["questions"] += 1

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


def get_focus_area_for_user(user_id: str) -> dict[str, Any]:
    sessions = get_sessions_for_user(user_id, limit=12)
    session_ids = [session["id"] for session in sessions]
    if not session_ids:
        return {
            "focus_area": None,
            "detail": "Complete an interview session to unlock a personalized focus area.",
            "supporting_category": None,
            "average_recent_score": None,
            "report_count": 0,
        }

    with SessionLocal() as db:
        reports = (
            db.query(SessionReport).filter(SessionReport.session_id.in_(session_ids)).all()
        )

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


def get_session_with_plan(session_id: str) -> dict[str, Any] | None:
    with SessionLocal() as db:
        session = db.get(InterviewSession, session_id)
        return _session_to_dict(session) if session is not None else None


def get_turns_for_session(session_id: str) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        turns = (
            db.query(InterviewTurn)
            .filter(InterviewTurn.session_id == session_id)
            .order_by(InterviewTurn.turn_index.asc())
            .all()
        )
        return [_turn_to_dict(t) for t in turns]


def get_turns_for_sessions(session_ids: list[str]) -> list[dict[str, Any]]:
    if not session_ids:
        return []

    with SessionLocal() as db:
        turns = (
            db.query(InterviewTurn)
            .filter(InterviewTurn.session_id.in_(session_ids))
            .order_by(InterviewTurn.turn_index.asc())
            .all()
        )
        return [_turn_to_dict(t) for t in turns]


def get_last_n_turns(session_id: str, n: int = 3) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        turns = (
            db.query(InterviewTurn)
            .filter(InterviewTurn.session_id == session_id)
            .order_by(InterviewTurn.turn_index.desc())
            .limit(n)
            .all()
        )
        return [_turn_to_dict(t) for t in reversed(turns)]


def write_report(report_data: dict[str, Any]) -> dict[str, Any]:
    with SessionLocal() as db:
        report = db.get(SessionReport, report_data["session_id"])
        if report is None:
            report = SessionReport(session_id=report_data["session_id"])
            db.add(report)

        report.overall = report_data["overall"]
        report.category_breakdown = report_data["category_breakdown"]
        report.strengths = report_data["strengths"]
        report.growth_areas = report_data["growth_areas"]
        report.recommended_next_steps = report_data["recommended_next_steps"]
        if report.generated_at is None:
            report.generated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(report)
        return _report_to_dict(report)


def get_report_for_session(session_id: str) -> dict[str, Any] | None:
    with SessionLocal() as db:
        report = db.get(SessionReport, session_id)
        return _report_to_dict(report) if report is not None else None


def update_session_status(session_id: str, status: str) -> None:
    with SessionLocal() as db:
        session = db.get(InterviewSession, session_id)
        if session is None:
            return
        session.status = status
        if status == "completed":
            session.completed_at = datetime.now(timezone.utc)
        db.commit()
