from pydantic import BaseModel, Field


class QueryUnderstanding(BaseModel):
    intent: str
    topics: list[str] = Field(default_factory=list)
    search_query: str