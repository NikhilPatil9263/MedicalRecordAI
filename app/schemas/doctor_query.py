from pydantic import BaseModel


class DoctorQueryRequest(BaseModel):
    appointment_id: int
    query: str


class DoctorQueryResponse(BaseModel):
    patient_id: int
    response: dict