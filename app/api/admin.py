from datetime import datetime
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from fastapi.responses import FileResponse

from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.auth.security import hash_password

from app.db.database import SessionLocal
from app.db.audit_service import create_audit_log

from app.models.user import User
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.document import Document
from app.models.audit_log import AuditLog


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ============================================================
# Schemas
# ============================================================

class CreateDoctorRequest(BaseModel):
    name: str
    email: str
    password: str
    specialization: str | None = None


class CreatePatientRequest(BaseModel):
    name: str
    email: str
    password: str
    date_of_birth: str | None = None
    gender: str | None = None


class CreateAppointmentRequest(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: datetime


# ============================================================
# Admin Authorization
# ============================================================

def require_admin(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# ============================================================
# Users
# ============================================================

@router.get("/users")
def get_users(
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        users = db.query(User).all()

        return [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at,
            }
            for user in users
        ]

    finally:
        db.close()


# ============================================================
# Doctors
# ============================================================

@router.post("/doctors")
def create_doctor(
    request: CreateDoctorRequest,
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        existing_user = db.query(User).filter(
            User.email == request.email
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        user = User(
            name=request.name,
            email=request.email,
            password_hash=hash_password(
                request.password
            ),
            role="doctor"
        )

        db.add(user)
        db.flush()

        doctor = Doctor(
            user_id=user.id,
            specialization=request.specialization
        )

        db.add(doctor)

        db.commit()
        db.refresh(doctor)

        create_audit_log(
            user_id=current_user.id,
            action="CREATE_DOCTOR",
            resource_type="doctor",
            resource_id=doctor.id,
        )

        return {
            "message": "Doctor created successfully",
            "doctor_id": doctor.id,
            "user_id": user.id,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


@router.get("/doctors")
def get_doctors(
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        results = (
            db.query(Doctor, User)
            .join(
                User,
                Doctor.user_id == User.id
            )
            .all()
        )

        return [
            {
                "doctor_id": doctor.id,
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "specialization": doctor.specialization,
            }
            for doctor, user in results
        ]

    finally:
        db.close()


# ============================================================
# Patients
# ============================================================

@router.post("/patients")
def create_patient(
    request: CreatePatientRequest,
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        existing_user = db.query(User).filter(
            User.email == request.email
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        user = User(
            name=request.name,
            email=request.email,
            password_hash=hash_password(
                request.password
            ),
            role="patient"
        )

        db.add(user)
        db.flush()

        patient = Patient(
            user_id=user.id,
            date_of_birth=request.date_of_birth,
            gender=request.gender
        )

        db.add(patient)

        db.commit()
        db.refresh(patient)

        create_audit_log(
            user_id=current_user.id,
            action="CREATE_PATIENT",
            resource_type="patient",
            resource_id=patient.id,
        )

        return {
            "message": "Patient created successfully",
            "patient_id": patient.id,
            "user_id": user.id,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


@router.get("/patients")
def get_patients(
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        results = (
            db.query(Patient, User)
            .join(
                User,
                Patient.user_id == User.id
            )
            .all()
        )

        return [
            {
                "patient_id": patient.id,
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "date_of_birth": patient.date_of_birth,
                "gender": patient.gender,
            }
            for patient, user in results
        ]

    finally:
        db.close()


# ============================================================
# Uploaded Documents
# ============================================================

@router.get("/documents")
def get_documents(
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        results = (
            db.query(Document, Patient, User)
            .join(
                Patient,
                Document.patient_id == Patient.id
            )
            .join(
                User,
                Patient.user_id == User.id
            )
            .order_by(
                Document.uploaded_at.desc()
            )
            .all()
        )

        return [
            {
                "document_id": document.id,
                "patient_id": document.patient_id,
                "patient_name": patient_user.name,
                "file_name": document.file_name,
                "file_type": document.file_type,
                "document_type": document.document_type,
                "extraction_method": document.extraction_method,
                "processing_status": document.processing_status,
                "uploaded_at": document.uploaded_at,
            }
            for document, patient, patient_user in results
        ]

    finally:
        db.close()


@router.get("/documents/{document_id}/view")
def view_document(
    document_id: int,
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        document = (
            db.query(Document)
            .filter(Document.id == document_id)
            .first()
        )

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )

        file_path = Path(document.file_path)

        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Uploaded document file not found"
            )

        create_audit_log(
            user_id=current_user.id,
            action="VIEW_DOCUMENT",
            resource_type="document",
            resource_id=document.id,
        )

        return FileResponse(
            path=file_path,
            filename=document.file_name,
            media_type=document.file_type or "application/octet-stream",
            content_disposition_type="inline",
        )

    finally:
        db.close()


# ============================================================
# Appointments
# ============================================================

@router.post("/appointments")
def create_appointment(
    request: CreateAppointmentRequest,
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        patient = db.query(Patient).filter(
            Patient.id == request.patient_id
        ).first()

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        doctor = db.query(Doctor).filter(
            Doctor.id == request.doctor_id
        ).first()

        if not doctor:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found"
            )

        appointment = Appointment(
            patient_id=request.patient_id,
            doctor_id=request.doctor_id,
            appointment_date=request.appointment_date,
            status="scheduled"
        )

        db.add(appointment)

        db.commit()
        db.refresh(appointment)

        create_audit_log(
            user_id=current_user.id,
            action="CREATE_APPOINTMENT",
            resource_type="appointment",
            resource_id=appointment.id,
        )

        return {
            "message": "Appointment created successfully",
            "appointment_id": appointment.id,
            "patient_id": appointment.patient_id,
            "doctor_id": appointment.doctor_id,
            "appointment_date": appointment.appointment_date,
            "status": appointment.status,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


@router.get("/appointments")
def get_appointments(
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        appointments = (
            db.query(Appointment)
            .all()
        )

        return [
            {
                "appointment_id": appointment.id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "appointment_date": appointment.appointment_date,
                "status": appointment.status,
            }
            for appointment in appointments
        ]

    finally:
        db.close()


# ============================================================
@router.get("/audit-logs")
def get_audit_logs(
    current_user: User = Depends(require_admin)
):
    db = SessionLocal()

    try:

        results = (
            db.query(AuditLog, User)
            .outerjoin(
                User,
                AuditLog.user_id == User.id
            )
            .order_by(
                AuditLog.created_at.desc()
            )
            .all()
        )

        return [
            {
                "id": log.id,
                "user_id": log.user_id,
                "actor": user.name if user else "System",
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "created_at": log.created_at,
            }
            for log, user in results
        ]

    finally:
        db.close()