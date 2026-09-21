from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class Measurement(BaseModel):
    category: str
    parameter: str
    value: Optional[str] = None
    unit: Optional[str] = None
    source_document: Optional[str] = None
    page_number: Optional[int] = None


class HospitalInformation(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None


class PatientDemographics(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    patient_id: Optional[str] = None
    study_date: Optional[str] = None
    dob: Optional[str] = None
    ht: Optional[str] = None
    wt: Optional[str] = None
    bsa: Optional[str] = None
    referring_physician: Optional[str] = None
    performed_by: Optional[str] = None

class SourceDocument(BaseModel):
    file_name: str
    page_number: int

class MedicalRecord(BaseModel):
    hospital_information: HospitalInformation
    patient_demographics: PatientDemographics
    measurements: list[Measurement] = Field(default_factory=list)
    sources: list[SourceDocument] = Field(default_factory=list)