"""Champion Dashboard API: authorization, request validation and serialization.

The service layer is stubbed so these run without a database — CI has no
Postgres. The SQL itself is covered by tests/integration/test_champion_queries.py,
which is skipped unless a real database is provided.
"""

import pytest
from fastapi.testclient import TestClient

from app.api.champion import router as champion_router
from app.api.champion.models import (
    ChampionProfile,
    ChampionStudentDetails,
    ChampionStudentListItem,
    ChampionStudentListResponse,
)
from app.database import get_db
from app.dependencies import get_current_claims
from app.main import app

CHAMPION_ID = "11111111-1111-4111-8111-111111111111"
STUDENT_ID = "22222222-2222-4222-8222-222222222222"

LIST_URL = "/api/champion/students"
DETAILS_URL = f"/api/champion/students/{STUDENT_ID}"


def claims_for(role: str | None) -> dict:
    app_metadata = {"role": role} if role else {}
    return {
        "sub": CHAMPION_ID,
        "email": "klyne@yournextsteps.example",
        "role": "authenticated",
        "app_metadata": app_metadata,
        "user_metadata": {"name": "Klyne Smith"},
    }


SAMPLE_LIST = ChampionStudentListResponse(
    students=[
        ChampionStudentListItem(
            id=STUDENT_ID,
            full_name="Maya Patel",
            questions_answered=68,
            interviews_completed=4,
            practice_time_seconds=9600,
        )
    ],
    page=1,
    page_size=25,
    total_count=142,
    total_pages=6,
)

SAMPLE_DETAILS = ChampionStudentDetails(
    id=STUDENT_ID,
    full_name="Maya Patel",
    school=None,
    grade_or_year="11th Grade",
    student_type="High School Student",
    email="maya@example.org",
    phone=None,
    questions_answered=68,
    interviews_completed=4,
    practice_time_seconds=9600,
)


@pytest.fixture
def recorded(monkeypatch):
    """Stub the service layer and capture the arguments the router passes it."""
    captured: dict[str, dict] = {}

    def fake_list_students(_db, **kwargs):
        captured["list"] = kwargs
        return SAMPLE_LIST

    def fake_get_student_details(_db, student_id, **kwargs):
        captured["details"] = {"student_id": student_id, **kwargs}
        return SAMPLE_DETAILS if student_id == STUDENT_ID else None

    def fake_get_champion_profile(_db, champion_id, _claims):
        captured["me"] = {"champion_id": champion_id}
        return ChampionProfile(
            id=champion_id,
            full_name="Klyne Smith",
            email="klyne@yournextsteps.example",
            role_label="Champion",
        )

    monkeypatch.setattr(champion_router.service, "list_students", fake_list_students)
    monkeypatch.setattr(champion_router.service, "get_student_details", fake_get_student_details)
    monkeypatch.setattr(champion_router.service, "get_champion_profile", fake_get_champion_profile)
    return captured


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: None
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def champion_client(client):
    app.dependency_overrides[get_current_claims] = lambda: claims_for("champion")
    return client


# --- authorization --------------------------------------------------------


@pytest.mark.parametrize("url", [LIST_URL, DETAILS_URL, "/api/champion/me"])
def test_anonymous_requests_are_rejected(client, url):
    assert client.get(url).status_code == 401


@pytest.mark.parametrize("url", [LIST_URL, DETAILS_URL, "/api/champion/me"])
def test_signed_in_student_is_forbidden(client, url):
    app.dependency_overrides[get_current_claims] = lambda: claims_for(None)
    response = client.get(url)
    assert response.status_code == 403
    assert response.json()["detail"] == "Champion access required"


@pytest.mark.parametrize("role", ["champion", "admin"])
def test_authorized_roles_get_through(client, recorded, role):
    app.dependency_overrides[get_current_claims] = lambda: claims_for(role)
    assert client.get(LIST_URL).status_code == 200


def test_roles_array_is_honoured(client, recorded):
    payload = claims_for(None)
    payload["app_metadata"]["roles"] = ["champion"]
    app.dependency_overrides[get_current_claims] = lambda: payload
    assert client.get(LIST_URL).status_code == 200


def test_token_without_a_subject_is_unauthorized(client, recorded):
    payload = claims_for("champion")
    payload.pop("sub")
    app.dependency_overrides[get_current_claims] = lambda: payload
    assert client.get(LIST_URL).status_code == 401


# --- student list ---------------------------------------------------------


def test_list_uses_the_documented_defaults(champion_client, recorded):
    assert champion_client.get(LIST_URL).status_code == 200
    assert recorded["list"] == {
        "search": None,
        "status": "all",
        "range_key": "30d",
        "sort_by": "fullName",
        "sort_order": "asc",
        "page": 1,
        "page_size": 25,
    }


def test_list_forwards_every_filter(champion_client, recorded):
    champion_client.get(
        LIST_URL,
        params={
            "search": "maya",
            "status": "active",
            "range": "school_year",
            "sortBy": "questionsAnswered",
            "sortOrder": "desc",
            "page": 3,
            "pageSize": 50,
        },
    )
    assert recorded["list"] == {
        "search": "maya",
        "status": "active",
        "range_key": "school_year",
        "sort_by": "questionsAnswered",
        "sort_order": "desc",
        "page": 3,
        "page_size": 50,
    }


def test_list_is_serialized_in_camel_case(champion_client, recorded):
    body = champion_client.get(LIST_URL).json()
    assert body["totalCount"] == 142
    assert body["totalPages"] == 6
    assert body["pageSize"] == 25
    assert body["students"][0] == {
        "id": STUDENT_ID,
        "fullName": "Maya Patel",
        "questionsAnswered": 68,
        "interviewsCompleted": 4,
        "practiceTimeSeconds": 9600,
    }


def test_list_never_leaks_extra_student_fields(champion_client, recorded):
    student = champion_client.get(LIST_URL).json()["students"][0]
    assert set(student) == {
        "id",
        "fullName",
        "questionsAnswered",
        "interviewsCompleted",
        "practiceTimeSeconds",
    }


# --- request validation ---------------------------------------------------


@pytest.mark.parametrize(
    "params",
    [
        {"status": "archived"},
        {"status": "'; DROP TABLE app_users; --"},
        {"range": "90d"},
        {"sortBy": "email"},
        {"sortBy": "full_name; DROP TABLE app_users"},
        {"sortOrder": "sideways"},
        {"page": 0},
        {"page": -1},
        {"page": "two"},
        {"pageSize": 0},
        {"pageSize": 500},
        {"search": "x" * 101},
    ],
)
def test_invalid_query_values_are_rejected(champion_client, recorded, params):
    assert champion_client.get(LIST_URL, params=params).status_code == 422


def test_rejected_requests_never_reach_the_service(champion_client, recorded):
    champion_client.get(LIST_URL, params={"sortBy": "email"})
    assert "list" not in recorded


# --- student details ------------------------------------------------------


def test_details_defaults_to_the_thirty_day_range(champion_client, recorded):
    assert champion_client.get(DETAILS_URL).status_code == 200
    assert recorded["details"] == {"student_id": STUDENT_ID, "range_key": "30d"}


def test_details_respects_the_selected_range(champion_client, recorded):
    champion_client.get(DETAILS_URL, params={"range": "all_time"})
    assert recorded["details"]["range_key"] == "all_time"


def test_details_reports_missing_contact_information_as_null(champion_client, recorded):
    body = champion_client.get(DETAILS_URL).json()
    assert body["school"] is None
    assert body["phone"] is None
    assert body["gradeOrYear"] == "11th Grade"
    assert body["studentType"] == "High School Student"


def test_unknown_student_is_a_404(champion_client, recorded):
    missing = "33333333-3333-4333-8333-333333333333"
    assert champion_client.get(f"/api/champion/students/{missing}").status_code == 404


def test_malformed_student_id_is_a_404_and_never_reaches_the_database(champion_client, recorded):
    response = champion_client.get("/api/champion/students/not-a-uuid")
    assert response.status_code == 404
    assert "details" not in recorded


def test_details_is_rejected_for_an_invalid_range(champion_client, recorded):
    assert champion_client.get(DETAILS_URL, params={"range": "yesterday"}).status_code == 422


# --- champion profile -----------------------------------------------------


def test_me_returns_the_signed_in_champion(champion_client, recorded):
    body = champion_client.get("/api/champion/me").json()
    assert body == {
        "id": CHAMPION_ID,
        "fullName": "Klyne Smith",
        "email": "klyne@yournextsteps.example",
        "roleLabel": "Champion",
    }


# --- removed surface ------------------------------------------------------


@pytest.mark.parametrize(
    "path",
    [
        "/api/champion/dashboard/summary",
        "/api/champion/notes",
        "/api/champion/assignments",
        "/api/champion/meetings",
        "/api/champion/interviews",
        "/api/champion/settings",
    ],
)
def test_out_of_scope_endpoints_no_longer_exist(champion_client, recorded, path):
    assert champion_client.get(path).status_code == 404
