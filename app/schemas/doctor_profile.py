from pydantic import BaseModel, EmailStr


class DoctorProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    specialization: str | None = None


class DoctorProfileUpdate(BaseModel):
    name: str
    email: EmailStr
    specialization: str | None = None