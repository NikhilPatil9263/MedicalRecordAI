from pydantic import BaseModel, Field


class MedicalResponse(BaseModel):
    patient_id: int
    summary: str
    sources: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)