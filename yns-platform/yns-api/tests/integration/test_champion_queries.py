"""Champion Dashboard SQL against a real PostgreSQL.

Skipped unless CHAMPION_TEST_DATABASE_URL points at a database you are happy for
the test to write to. Everything is created inside a dedicated ``champion_test``
schema and dropped afterwards, so it never touches ``public``.

    CHAMPION_TEST_DATABASE_URL=postgresql+psycopg2://... python -m pytest \
        tests/integration/test_champion_queries.py

CI does not run this: the pipeline has no database service.
"""

import json
import os
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.api.champion import service

DATABASE_URL = os.getenv("CHAMPION_TEST_DATABASE_URL")

pytestmark = [
    pytest.mark.database,
    pytest.mark.skipif(not DATABASE_URL, reason="CHAMPION_TEST_DATABASE_URL is not set"),
]

NOW = datetime.now(timezone.utc)
PLAN = json.dumps({"session_type": "behavioral", "target_minutes": 20, "questions": []})
QUESTION = json.dumps({"id": "q", "category": "behavioral", "difficulty": "warmup", "text": "?"})

SCHEMA = """
create table app_users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    name text,
    user_type text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create table career_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_users(id) on delete cascade,
    grade_level text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create table interview_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_users(id) on delete cascade,
    session_type text not null,
    status text not null,
    session_plan jsonb not null,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now()
);
create table interview_turns (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references interview_sessions(id) on delete cascade,
    turn_index int not null,
    question jsonb not null,
    answer_text text,
    created_at timestamptz not null default now(),
    unique (session_id, turn_index)
);
"""


def add_student(conn, name, *, user_type="high_school", grade=None,
                questions=0, interviews=0, seconds=0, days_ago=2):
    user_id = conn.execute(
        text("insert into app_users (email, name, user_type) values (:e, :n, :t) returning id"),
        {"e": f"{name.lower().replace(' ', '.')}@example.org", "n": name, "t": user_type},
    ).scalar_one()

    if grade:
        conn.execute(
            text("insert into career_profiles (user_id, grade_level) values (:u, :g)"),
            {"u": user_id, "g": grade},
        )

    for i in range(interviews):
        completed = NOW - timedelta(days=days_ago, hours=i)
        started = completed - timedelta(seconds=seconds // max(interviews, 1))
        session_id = conn.execute(
            text("insert into interview_sessions "
                 "(user_id, session_type, status, session_plan, started_at, completed_at) "
                 "values (:u, 'behavioral', 'completed', cast(:p as jsonb), :s, :c) returning id"),
            {"u": user_id, "p": PLAN, "s": started, "c": completed},
        ).scalar_one()
        if i == 0 and questions:
            conn.execute(
                text("insert into interview_turns (session_id, turn_index, question, answer_text, created_at) "
                     "select :sid, g, cast(:q as jsonb), 'answer', :ts from generate_series(0, :n - 1) g"),
                {"sid": session_id, "q": QUESTION, "ts": completed, "n": questions},
            )
    return str(user_id)


@pytest.fixture
def db():
    engine = create_engine(DATABASE_URL)
    connection = engine.connect()
    connection.execute(text("drop schema if exists champion_test cascade"))
    connection.execute(text("create schema champion_test"))
    connection.execute(text("set search_path to champion_test"))
    for statement in filter(str.strip, SCHEMA.split(";")):
        connection.execute(text(statement))

    add_student(connection, "Aaliyah Thompson", grade="11th Grade",
                questions=186, interviews=6, seconds=4 * 3600 + 12 * 60)
    add_student(connection, "Brandon Lee", user_type="college_student",
                questions=142, interviews=4, seconds=3 * 3600 + 28 * 60)
    add_student(connection, "Marcus Webb", user_type="college_student",
                questions=64, interviews=2, seconds=3100, days_ago=200)
    add_student(connection, "Noah Bennett", grade="9th Grade")

    session = Session(bind=connection)
    yield session

    session.close()
    connection.execute(text("drop schema if exists champion_test cascade"))
    connection.commit()
    connection.close()
    engine.dispose()


def names(result):
    return [student.full_name for student in result.students]


def query(db, **overrides):
    params = dict(search=None, status="all", range_key="30d",
                  sort_by="fullName", sort_order="asc", page=1, page_size=25)
    params.update(overrides)
    return service.list_students(db, **params)


def test_aggregates_match_the_underlying_rows(db):
    aaliyah = next(s for s in query(db).students if s.full_name == "Aaliyah Thompson")
    assert aaliyah.questions_answered == 186
    assert aaliyah.interviews_completed == 6
    assert aaliyah.practice_time_seconds == 4 * 3600 + 12 * 60


def test_students_without_activity_are_still_listed(db):
    assert "Noah Bennett" in names(query(db))


def test_default_sort_is_name_ascending(db):
    assert names(query(db)) == sorted(names(query(db)))


SORT_VALUES = {
    "fullName": lambda s: s.full_name,
    "questionsAnswered": lambda s: s.questions_answered,
    "interviewsCompleted": lambda s: s.interviews_completed,
    "practiceTime": lambda s: s.practice_time_seconds,
}


@pytest.mark.parametrize("sort_by", sorted(SORT_VALUES))
def test_every_column_is_sortable_in_both_directions(db, sort_by):
    read = SORT_VALUES[sort_by]
    ascending = [read(s) for s in query(db, sort_by=sort_by, sort_order="asc").students]
    descending = [read(s) for s in query(db, sort_by=sort_by, sort_order="desc").students]

    assert ascending == sorted(ascending)
    assert descending == sorted(descending, reverse=True)


def test_ties_keep_a_stable_order_so_pages_do_not_shuffle(db):
    # Marcus and Noah both score zero inside the 30-day window. The id tiebreaker
    # means their relative order is identical whichever direction is requested,
    # which is what keeps pagination from repeating or dropping rows.
    ascending = names(query(db, sort_by="questionsAnswered", sort_order="asc"))
    descending = names(query(db, sort_by="questionsAnswered", sort_order="desc"))
    tied = {"Marcus Webb", "Noah Bennett"}

    assert [n for n in ascending if n in tied] == [n for n in descending if n in tied]


def test_name_sort_reverses_exactly(db):
    ascending = names(query(db, sort_by="fullName", sort_order="asc"))
    descending = names(query(db, sort_by="fullName", sort_order="desc"))
    assert ascending == list(reversed(descending))


def test_search_matches_part_of_a_name(db):
    assert names(query(db, search="thom")) == ["Aaliyah Thompson"]


def test_search_is_case_insensitive(db):
    assert names(query(db, search="AALIYAH")) == ["Aaliyah Thompson"]


def test_search_wildcards_are_treated_literally(db):
    assert query(db, search="%").total_count == 0
    assert query(db, search="_").total_count == 0


def test_activity_filters_partition_the_roster(db):
    assert names(query(db, status="active")) == ["Aaliyah Thompson", "Brandon Lee"]
    assert names(query(db, status="inactive")) == ["Marcus Webb"]
    assert names(query(db, status="never_started")) == ["Noah Bennett"]
    assert query(db, status="all").total_count == 4


def test_widening_the_range_reclassifies_stale_activity(db):
    assert "Marcus Webb" in names(query(db, status="active", range_key="all_time"))
    # No amount of widening turns an empty account into an active one.
    assert names(query(db, status="never_started", range_key="all_time")) == ["Noah Bennett"]


def test_narrowing_the_range_zeroes_out_stale_totals(db):
    marcus = next(s for s in query(db, range_key="7d").students if s.full_name == "Marcus Webb")
    assert marcus.questions_answered == 0
    assert marcus.practice_time_seconds == 0


def test_pagination_reports_a_stable_total(db):
    page_one = query(db, page=1, page_size=2)
    page_two = query(db, page=2, page_size=2)
    assert page_one.total_count == page_two.total_count == 4
    assert page_one.total_pages == 2
    assert set(names(page_one)).isdisjoint(names(page_two))


def test_a_page_past_the_end_still_reports_the_total(db):
    result = query(db, page=50, page_size=2)
    assert result.students == []
    assert result.total_count == 4


def test_details_include_the_profile_and_omit_unstored_fields(db):
    student_id = next(s.id for s in query(db).students if s.full_name == "Aaliyah Thompson")
    details = service.get_student_details(db, student_id, range_key="30d")
    assert details.grade_or_year == "11th Grade"
    assert details.student_type == "High School Student"
    assert details.email == "aaliyah.thompson@example.org"
    assert details.school is None
    assert details.phone is None


def test_details_for_an_unknown_student_are_none(db):
    assert service.get_student_details(
        db, "00000000-0000-0000-0000-000000000000", range_key="30d"
    ) is None
