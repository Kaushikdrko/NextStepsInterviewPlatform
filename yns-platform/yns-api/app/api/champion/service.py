"""Data access for the Champion Dashboard.

Every aggregate is computed in Postgres — the browser never receives more than
one page of students, and no counting or summing happens in Python.

Two facts drive the shape of this module:

* Champions are not assigned students. Every authorized champion sees the same
  organization-wide list, so nothing here filters by the caller's id.
* Practice time is not a stored column. It is derived from a completed session's
  wall-clock span, capped per session by ``domain.MAX_SESSION_SECONDS``.

The queries run through the SQLAlchemy engine (``DATABASE_URL``), which connects
as the table owner and is therefore not subject to the student-scoped RLS
policies in ``docs/rls-policies.sql`` — the same path the existing admin-only
endpoints already use. Authorization is enforced in the router by
``require_champion_user``.
"""

import math
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.api.champion import domain
from app.api.champion.models import (
    ChampionProfile,
    ChampionStudentDetails,
    ChampionStudentListItem,
    ChampionStudentListResponse,
)

# Shared CTE chain. Every value that comes from the request arrives as a bound
# parameter; the only interpolated fragment anywhere is the ORDER BY clause,
# which is built from an allowlist in domain.order_by_clause().
#
# Parameters are explicitly CAST so Postgres can infer a type even when the
# value is NULL (an untyped NULL parameter is a query error, not a no-op).
_BASE_CTE = """
WITH students AS (
    SELECT
        u.id AS id,
        COALESCE(NULLIF(BTRIM(u.name), ''), u.email) AS full_name,
        u.email AS email,
        u.user_type AS user_type
    FROM app_users u
    WHERE u.user_type IN :student_user_types
      AND (
        CAST(:student_id AS uuid) IS NULL
        OR u.id = CAST(:student_id AS uuid)
      )
),
turn_totals AS (
    SELECT
        s.user_id AS user_id,
        COUNT(*) FILTER (
            WHERE CAST(:start_at AS timestamptz) IS NULL
               OR t.created_at >= CAST(:start_at AS timestamptz)
        ) AS questions_in_range,
        COUNT(*) AS questions_lifetime
    FROM interview_turns t
    JOIN interview_sessions s ON s.id = t.session_id
    JOIN students st ON st.id = s.user_id
    WHERE t.answer_text IS NOT NULL
    GROUP BY s.user_id
),
session_totals AS (
    SELECT
        s.user_id AS user_id,
        COUNT(*) FILTER (
            WHERE s.status = 'completed'
              AND (
                CAST(:start_at AS timestamptz) IS NULL
                OR COALESCE(s.completed_at, s.started_at) >= CAST(:start_at AS timestamptz)
              )
        ) AS interviews_in_range,
        COUNT(*) FILTER (WHERE s.status = 'completed') AS interviews_lifetime,
        COALESCE(SUM(
            LEAST(
                GREATEST(EXTRACT(EPOCH FROM (s.completed_at - s.started_at)), 0),
                CAST(:max_session_seconds AS numeric)
            )
        ) FILTER (
            WHERE s.status = 'completed'
              AND s.completed_at IS NOT NULL
              AND (
                CAST(:start_at AS timestamptz) IS NULL
                OR s.completed_at >= CAST(:start_at AS timestamptz)
              )
        ), 0) AS practice_seconds_in_range,
        COALESCE(SUM(
            LEAST(
                GREATEST(EXTRACT(EPOCH FROM (s.completed_at - s.started_at)), 0),
                CAST(:max_session_seconds AS numeric)
            )
        ) FILTER (
            WHERE s.status = 'completed' AND s.completed_at IS NOT NULL
        ), 0) AS practice_seconds_lifetime
    FROM interview_sessions s
    JOIN students st ON st.id = s.user_id
    GROUP BY s.user_id
),
rolled_up AS (
    SELECT
        st.id AS id,
        st.full_name AS full_name,
        st.email AS email,
        st.user_type AS user_type,
        LOWER(st.full_name) AS sort_full_name,
        CAST(COALESCE(tt.questions_in_range, 0) AS bigint) AS questions_answered,
        CAST(COALESCE(se.interviews_in_range, 0) AS bigint) AS interviews_completed,
        CAST(COALESCE(se.practice_seconds_in_range, 0) AS bigint) AS practice_time_seconds,
        CAST(COALESCE(tt.questions_lifetime, 0) AS bigint) AS questions_lifetime,
        CAST(COALESCE(se.interviews_lifetime, 0) AS bigint) AS interviews_lifetime,
        CAST(COALESCE(se.practice_seconds_lifetime, 0) AS bigint) AS practice_seconds_lifetime
    FROM students st
    LEFT JOIN turn_totals tt ON tt.user_id = st.id
    LEFT JOIN session_totals se ON se.user_id = st.id
),
classified AS (
    SELECT
        r.*,
        CASE
            WHEN r.questions_lifetime = 0
             AND r.interviews_lifetime = 0
             AND r.practice_seconds_lifetime = 0 THEN 'never_started'
            WHEN r.questions_answered > 0 OR r.interviews_completed > 0 THEN 'active'
            ELSE 'inactive'
        END AS activity_status
    FROM rolled_up r
),
filtered AS (
    SELECT c.*
    FROM classified c
    WHERE (:status = 'all' OR c.activity_status = :status)
      AND (
        CAST(:search_pattern AS text) IS NULL
        OR c.full_name ILIKE CAST(:search_pattern AS text)
        OR c.email ILIKE CAST(:search_pattern AS text)
      )
)
"""

_PROFILES_CTE = """
, profiles AS (
    SELECT DISTINCT ON (cp.user_id)
        cp.user_id AS user_id,
        cp.grade_level AS grade_level
    FROM career_profiles cp
    JOIN students st ON st.id = cp.user_id
    ORDER BY cp.user_id, cp.created_at DESC
)
"""

_COUNT_TAIL = " SELECT COUNT(*) AS total_count FROM filtered"

_DETAILS_TAIL = """
SELECT
    CAST(f.id AS text) AS id,
    f.full_name,
    f.email,
    f.user_type,
    f.questions_answered,
    f.interviews_completed,
    f.practice_time_seconds,
    p.grade_level
FROM filtered f
LEFT JOIN profiles p ON p.user_id = f.id
LIMIT 1
"""

_CHAMPION_PROFILE_SQL = """
SELECT
    CAST(u.id AS text) AS id,
    COALESCE(NULLIF(BTRIM(u.name), ''), u.email) AS full_name,
    u.email AS email
FROM app_users u
WHERE u.id = CAST(:champion_id AS uuid)
LIMIT 1
"""


def _base_params(
    *,
    start_at: datetime | None,
    status: str,
    search: str | None,
    student_id: str | None,
) -> dict[str, Any]:
    term = (search or "").strip()
    return {
        "student_user_types": list(domain.STUDENT_USER_TYPES),
        "student_id": student_id,
        "start_at": start_at,
        "max_session_seconds": domain.MAX_SESSION_SECONDS,
        "status": status,
        "search_pattern": f"%{domain.escape_like(term)}%" if term else None,
    }


def _statement(sql: str):
    return text(sql).bindparams(bindparam("student_user_types", expanding=True))


def is_valid_student_id(student_id: str) -> bool:
    try:
        uuid.UUID(student_id)
    except (ValueError, AttributeError, TypeError):
        return False
    return True


def list_students(
    db: Session,
    *,
    search: str | None,
    status: str,
    range_key: str,
    sort_by: str,
    sort_order: str,
    page: int,
    page_size: int,
    now: datetime | None = None,
) -> ChampionStudentListResponse:
    params = _base_params(
        start_at=domain.range_start(range_key, now),
        status=status,
        search=search,
        student_id=None,
    )
    params["limit"] = page_size
    params["offset"] = (page - 1) * page_size

    list_sql = (
        f"{_BASE_CTE} SELECT f.*, COUNT(*) OVER () AS total_count "
        f"FROM filtered f ORDER BY {domain.order_by_clause(sort_by, sort_order)} "
        "LIMIT :limit OFFSET :offset"
    )
    rows = db.execute(_statement(list_sql), params).mappings().all()

    if rows:
        total_count = int(rows[0]["total_count"])
    else:
        # The window count disappears with the rows, which happens whenever the
        # requested page is past the end of the result set.
        total_count = int(db.execute(_statement(_BASE_CTE + _COUNT_TAIL), params).scalar_one())

    return ChampionStudentListResponse(
        students=[
            ChampionStudentListItem(
                id=str(row["id"]),
                full_name=row["full_name"],
                questions_answered=int(row["questions_answered"]),
                interviews_completed=int(row["interviews_completed"]),
                practice_time_seconds=int(row["practice_time_seconds"]),
            )
            for row in rows
        ],
        page=page,
        page_size=page_size,
        total_count=total_count,
        total_pages=math.ceil(total_count / page_size) if total_count else 0,
    )


def get_student_details(
    db: Session,
    student_id: str,
    *,
    range_key: str,
    now: datetime | None = None,
) -> ChampionStudentDetails | None:
    params = _base_params(
        start_at=domain.range_start(range_key, now),
        status="all",
        search=None,
        student_id=student_id,
    )

    row = (
        db.execute(_statement(_BASE_CTE + _PROFILES_CTE + _DETAILS_TAIL), params)
        .mappings()
        .first()
    )
    if row is None:
        return None

    return ChampionStudentDetails(
        id=row["id"],
        full_name=row["full_name"],
        # Neither value has a column in the schema yet — see the model docstring.
        school=None,
        phone=None,
        grade_or_year=row["grade_level"],
        student_type=domain.student_type_label(row["user_type"]),
        email=row["email"],
        questions_answered=int(row["questions_answered"]),
        interviews_completed=int(row["interviews_completed"]),
        practice_time_seconds=int(row["practice_time_seconds"]),
    )


def get_champion_profile(db: Session, champion_id: str, claims: dict[str, Any]) -> ChampionProfile:
    """Account information for the header, preferring the database over the JWT."""
    user_metadata = claims.get("user_metadata") or {}
    fallback_email = claims.get("email") or user_metadata.get("email")
    fallback_name = user_metadata.get("name") or user_metadata.get("full_name")

    row = None
    if is_valid_student_id(champion_id):
        row = db.execute(text(_CHAMPION_PROFILE_SQL), {"champion_id": champion_id}).mappings().first()

    full_name = (row["full_name"] if row else None) or fallback_name or fallback_email or "Champion"
    email = (row["email"] if row else None) or fallback_email

    return ChampionProfile(
        id=champion_id,
        full_name=full_name,
        email=email,
        role_label="Champion",
    )
