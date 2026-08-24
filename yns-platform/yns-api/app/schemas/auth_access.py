from pydantic import BaseModel


class ChampionAccessResponse(BaseModel):
    authorized: bool
