"""Pydantic schemas for the Champion Dashboard API.

Field names are serialized in camelCase (via ``to_camel``) so responses map
directly onto the frontend TypeScript models in
``yns-web/lib/champion/types.ts``. Requests accept either camelCase or snake_case
thanks to ``populate_by_name``.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ChampionBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ChampionProfile(ChampionBase):
    """The signed-in champion's own account information, for the page header."""

    id: str
    full_name: str
    email: str | None = None
    role_label: str


class ChampionStudentListItem(ChampionBase):
    """One row of the student table — exactly the four visible columns."""

    id: str
    full_name: str
    questions_answered: int
    interviews_completed: int
    practice_time_seconds: int


class ChampionStudentListResponse(ChampionBase):
    students: list[ChampionStudentListItem]
    page: int
    page_size: int
    total_count: int
    total_pages: int


class ChampionStudentDetails(ChampionBase):
    """Minimal, view-only student information for the details drawer.

    ``school`` and ``phone`` are always None today: neither is stored anywhere in
    the schema. See docs/champion-dashboard.md for the columns that would need to
    be added. Returning None keeps the drawer honest ("Not provided") instead of
    showing a plausible-looking wrong value.
    """

    id: str
    full_name: str
    school: str | None = None
    grade_or_year: str | None = None
    student_type: str | None = None
    email: str | None = None
    phone: str | None = None
    questions_answered: int
    interviews_completed: int
    practice_time_seconds: int
