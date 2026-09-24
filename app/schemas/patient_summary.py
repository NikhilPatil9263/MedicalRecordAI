from pydantic import BaseModel
from typing import Optional


class PatientSummaryInfo(BaseModel):
    id: int
    name: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None


class MedicalSummaryItem(BaseModel):
    parameter: str
    value: Optional[str] = None
    unit: Optional[str] = None
    source_document: Optional[str] = None
    page_number: Optional[int] = None


class PatientReportSummary(BaseModel):
    id: int
    file_name: str
    document_type: Optional[str] = None
    uploaded_at: Optional[str] = None


class PatientAppointmentSummary(BaseModel):
    id: int
    appointment_date: Optional[str] = None
    status: Optional[str] = None


class PatientSummaryResponse(BaseModel):
    patient: PatientSummaryInfo
    medical_history: list[MedicalSummaryItem]
    medications: list[MedicalSummaryItem]
    investigations: list[MedicalSummaryItem]
    allergies: list[MedicalSummaryItem]
    recent_reports: list[PatientReportSummary]
    appointments: list[PatientAppointmentSummary]