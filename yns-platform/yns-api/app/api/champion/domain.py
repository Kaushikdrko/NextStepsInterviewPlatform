"""Domain rules shared by every part of the Champion Dashboard.

Activity-status and date-range definitions live here — and only here — so the
SQL layer, the API layer and the tests cannot drift apart.
"""

from datetime import datetime, timedelta, timezone
from typing import Literal

ActivityStatus = Literal["all", "active", "inactive", "never_started"]
DashboardRange = Literal["7d", "30d", "school_year", "all_time"]
SortBy = Literal["fullName", "questionsAnswered", "interviewsCompleted", "practiceTime"]
SortOrder = Literal["asc", "desc"]

DEFAULT_RANGE: DashboardRange = "30d"
DEFAULT_STATUS: ActivityStatus = "all"
DEFAULT_SORT_BY: SortBy = "fullName"
DEFAULT_SORT_ORDER: SortOrder = "asc"
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100

# ``app_users.user_type`` values that represent a student. There is no champion
# role column in the database (the role lives in the Supabase JWT), so the
# student list is defined by user_type instead. Both the API spellings and the
# frontend spellings are accepted because onboarding has written both.
STUDENT_USER_TYPES = (
    "high_school",
    "college_student",
    "college",
    "recent_graduate",
    "recent_grad",
)

STUDENT_TYPE_LABELS = {
    "high_school": "High School Student",
    "college_student": "College Student",
    "college": "College Student",
    "recent_graduate": "Recent Graduate",
    "recent_grad": "Recent Graduate",
}

# The academic year is treated as starting on 1 August.
SCHOOL_YEAR_START_MONTH = 8

# Practice time is not stored; it is derived from a completed session's
# wall-clock span (completed_at - started_at). A student who leaves a tab open
# overnight and finishes the next morning would otherwise contribute a wildly
# inflated total, so a single session contributes at most this many seconds.
MAX_SESSION_SECONDS = 4 * 60 * 60

# Maps the public sort key to the SQL column it orders by. Values are only ever
# read out of this dict, never taken from the request, so embedding them in the
# ORDER BY clause is safe.
SORT_COLUMNS: dict[str, str] = {
    "fullName": "sort_full_name",
    "questionsAnswered": "questions_answered",
    "interviewsCompleted": "interviews_completed",
    "practiceTime": "practice_time_seconds",
}


def range_start(range_key: str, now: datetime | None = None) -> datetime | None:
    """Inclusive lower bound for a dashboard range, or None for no lower bound."""
    reference = now or datetime.now(timezone.utc)

    if range_key == "7d":
        return reference - timedelta(days=7)
    if range_key == "30d":
        return reference - timedelta(days=30)
    if range_key == "school_year":
        year = reference.year if reference.month >= SCHOOL_YEAR_START_MONTH else reference.year - 1
        return datetime(year, SCHOOL_YEAR_START_MONTH, 1, tzinfo=timezone.utc)
    if range_key == "all_time":
        return None

    raise ValueError(f"Unsupported dashboard range: {range_key!r}")


def classify_activity(
    *,
    questions_in_range: int,
    interviews_in_range: int,
    questions_lifetime: int,
    interviews_lifetime: int,
    practice_seconds_lifetime: int,
) -> str:
    """Reference implementation of the activity rules enforced in SQL.

    never_started — no lifetime activity of any kind.
    active        — answered a question or completed an interview in range.
    inactive      — has lifetime activity but none inside the selected range.
    """
    if questions_lifetime == 0 and interviews_lifetime == 0 and practice_seconds_lifetime == 0:
        return "never_started"
    if questions_in_range > 0 or interviews_in_range > 0:
        return "active"
    return "inactive"


def order_by_clause(sort_by: str, sort_order: str) -> str:
    """Build a validated ORDER BY fragment. Raises on anything not allowlisted."""
    column = SORT_COLUMNS.get(sort_by)
    if column is None:
        raise ValueError(f"Unsupported sort field: {sort_by!r}")
    if sort_order not in ("asc", "desc"):
        raise ValueError(f"Unsupported sort order: {sort_order!r}")

    direction = "ASC" if sort_order == "asc" else "DESC"
    # id is the tiebreaker so pagination stays stable across equal values.
    return f"{column} {direction} NULLS LAST, id ASC"


def escape_like(term: str) -> str:
    """Escape LIKE wildcards so a search for "50%" cannot match everything."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def student_type_label(user_type: str | None) -> str | None:
    if not user_type:
        return None
    return STUDENT_TYPE_LABELS.get(user_type, user_type.replace("_", " ").title())
