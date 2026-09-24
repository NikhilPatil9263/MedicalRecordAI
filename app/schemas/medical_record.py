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


class MedicalHistory(BaseModel):
    condition: str
    details: Optional[str] = None


class Diagnosis(BaseModel):
    condition: str
    details: Optional[str] = None


class Medication(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    details: Optional[str] = None


class Allergy(BaseModel):
    allergen: str
    reaction: Optional[str] = None


class Investigation(BaseModel):
    name: str
    date: Optional[str] = None
    findings: Optional[str] = None


class SourceDocument(BaseModel):
    file_name: str
    page_number: int


class MedicalRecord(BaseModel):
    hospital_information: HospitalInformation
    patient_demographics: PatientDemographics

    medical_history: list[MedicalHistory] = Field(
        default_factory=list
    )

    diagnoses: list[Diagnosis] = Field(
        default_factory=list
    )

    medications: list[Medication] = Field(
        default_factory=list
    )

    allergies: list[Allergy] = Field(
        default_factory=list
    )

    investigations: list[Investigation] = Field(
        default_factory=list
    )

    measurements: list[Measurement] = Field(
        default_factory=list
    )

    sources: list[SourceDocument] = Field(
        default_factory=list
    )