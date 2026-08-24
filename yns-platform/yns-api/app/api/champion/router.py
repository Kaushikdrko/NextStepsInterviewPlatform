"""Champion Dashboard API routes.

Mounted at ``/api/champion`` in ``app/main.py``. Responses use the schemas in
``models.py`` (camelCase JSON).

Every route requires an email on the allowlist in ``app/admin_emails.py``.
Authorization is enforced here, independently of the frontend route guard in
``yns-web/middleware.ts`` and ``yns-web/components/champion/ChampionAccessGuard.tsx``.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.champion import domain, service
from app.api.champion.models import (
    ChampionProfile,
    ChampionStudentDetails,
    ChampionStudentListResponse,
)
from app.database import get_db
from app.dependencies import get_current_claims, require_champion_user

router = APIRouter(dependencies=[Depends(require_champion_user)])


@router.get("/me", response_model=ChampionProfile)
def get_champion_profile(
    champion_id: str = Depends(require_champion_user),
    claims: dict[str, Any] = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    return service.get_champion_profile(db, champion_id, claims)


@router.get("/students", response_model=ChampionStudentListResponse)
def list_students(
    search: str | None = Query(default=None, max_length=100),
    status: domain.ActivityStatus = Query(default=domain.DEFAULT_STATUS),
    range_key: domain.DashboardRange = Query(default=domain.DEFAULT_RANGE, alias="range"),
    sort_by: domain.SortBy = Query(default=domain.DEFAULT_SORT_BY, alias="sortBy"),
    sort_order: domain.SortOrder = Query(default=domain.DEFAULT_SORT_ORDER, alias="sortOrder"),
    page: int = Query(default=1, ge=1, le=10_000),
    page_size: int = Query(
        default=domain.DEFAULT_PAGE_SIZE, ge=1, le=domain.MAX_PAGE_SIZE, alias="pageSize"
    ),
    db: Session = Depends(get_db),
):
    """Organization-wide student list.

    Search, activity filtering, sorting, date-range aggregation and pagination
    all happen in Postgres. Invalid filter, sort and pagination values are
    rejected with a 422 by the Literal/ge/le constraints above.
    """
    return service.list_students(
        db,
        search=search,
        status=status,
        range_key=range_key,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/students/{student_id}", response_model=ChampionStudentDetails)
def get_student(
    student_id: str,
    range_key: domain.DashboardRange = Query(default=domain.DEFAULT_RANGE, alias="range"),
    db: Session = Depends(get_db),
):
    # A malformed id would otherwise reach Postgres as a bad uuid cast.
    if not service.is_valid_student_id(student_id):
        raise HTTPException(status_code=404, detail="Student not found")

    student = service.get_student_details(db, student_id, range_key=range_key)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    return student
