from datetime import datetime, timedelta, timezone

import pytest

from app.api.champion import domain


def at(year, month, day) -> datetime:
    return datetime(year, month, day, tzinfo=timezone.utc)


# --- date ranges ----------------------------------------------------------


def test_seven_day_range_starts_a_week_back():
    now = at(2026, 7, 27)
    assert domain.range_start("7d", now) == now - timedelta(days=7)


def test_thirty_day_range_starts_a_month_back():
    now = at(2026, 7, 27)
    assert domain.range_start("30d", now) == now - timedelta(days=30)


def test_all_time_has_no_lower_bound():
    assert domain.range_start("all_time", at(2026, 7, 27)) is None


def test_school_year_before_august_uses_the_previous_august():
    assert domain.range_start("school_year", at(2026, 7, 27)) == at(2025, 8, 1)


def test_school_year_on_or_after_august_uses_the_current_august():
    assert domain.range_start("school_year", at(2026, 8, 1)) == at(2026, 8, 1)
    assert domain.range_start("school_year", at(2026, 11, 3)) == at(2026, 8, 1)


def test_unknown_range_is_rejected():
    with pytest.raises(ValueError):
        domain.range_start("last_tuesday")


# --- activity classification ----------------------------------------------


def classify(**overrides) -> str:
    defaults = dict(
        questions_in_range=0,
        interviews_in_range=0,
        questions_lifetime=0,
        interviews_lifetime=0,
        practice_seconds_lifetime=0,
    )
    defaults.update(overrides)
    return domain.classify_activity(**defaults)


def test_no_activity_at_all_is_never_started():
    assert classify() == "never_started"


def test_activity_inside_the_range_is_active():
    assert classify(questions_in_range=3, questions_lifetime=3) == "active"
    assert classify(interviews_in_range=1, interviews_lifetime=1) == "active"


def test_history_but_nothing_in_range_is_inactive():
    assert classify(questions_lifetime=40, interviews_lifetime=2) == "inactive"


def test_practice_time_alone_still_counts_as_started():
    # A session with recorded time but no answered turns is not "never started".
    assert classify(practice_seconds_lifetime=900) == "inactive"


# --- sorting allowlist ----------------------------------------------------


@pytest.mark.parametrize("sort_by", sorted(domain.SORT_COLUMNS))
def test_every_sortable_column_builds_a_clause(sort_by):
    clause = domain.order_by_clause(sort_by, "asc")
    assert clause.startswith(domain.SORT_COLUMNS[sort_by])
    assert clause.endswith("id ASC")


def test_sort_order_controls_direction():
    assert " DESC " in domain.order_by_clause("practiceTime", "desc")
    assert " ASC " in domain.order_by_clause("practiceTime", "asc")


def test_unknown_sort_field_is_rejected():
    with pytest.raises(ValueError):
        domain.order_by_clause("email", "asc")


def test_sort_field_cannot_smuggle_sql():
    with pytest.raises(ValueError):
        domain.order_by_clause("full_name; DROP TABLE app_users", "asc")


def test_unknown_sort_order_is_rejected():
    with pytest.raises(ValueError):
        domain.order_by_clause("fullName", "; DROP TABLE app_users")


# --- search escaping ------------------------------------------------------


def test_like_wildcards_are_escaped():
    assert domain.escape_like("100%") == "100\\%"
    assert domain.escape_like("a_b") == "a\\_b"


def test_backslash_is_escaped_before_the_wildcards():
    assert domain.escape_like("a\\%") == "a\\\\\\%"


def test_ordinary_search_terms_are_untouched():
    assert domain.escape_like("Maya Patel") == "Maya Patel"


# --- student type labels --------------------------------------------------


def test_known_user_types_get_friendly_labels():
    assert domain.student_type_label("high_school") == "High School Student"
    assert domain.student_type_label("college_student") == "College Student"
    assert domain.student_type_label("recent_grad") == "Recent Graduate"


def test_unknown_user_type_is_humanized_rather_than_dropped():
    assert domain.student_type_label("transfer_student") == "Transfer Student"


def test_missing_user_type_is_none():
    assert domain.student_type_label(None) is None
    assert domain.student_type_label("") is None
