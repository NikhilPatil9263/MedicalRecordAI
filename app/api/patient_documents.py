import mimetypes
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.auth.dependencies import get_current_user
from app.db.audit_service import create_audit_log
from app.db.database import SessionLocal
from app.ingestion.ingestion_service import process_document
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.document import Document
from app.models.patient import Patient
from app.models.user import User
from app.schemas.document import (
    DocumentResponse,
    DocumentUploadResponse,
)


router = APIRouter(
    prefix="/patient",
    tags=["Patient Documents"],
)

UPLOAD_DIR = "data/uploads"


# ============================================================
# Upload Medical Document
# ============================================================

@router.post(
    "/documents/upload",
    response_model=DocumentUploadResponse,
)
def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "patient":
        raise HTTPException(
            status_code=403,
            detail="Patient access required",
        )

    db = SessionLocal()

    try:
        # ----------------------------------------------------
        # Get authenticated patient's profile
        # ----------------------------------------------------
        patient = (
            db.query(Patient)
            .filter(
                Patient.user_id == current_user.id
            )
            .first()
        )

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found",
            )

        # ----------------------------------------------------
        # Validate uploaded file
        # ----------------------------------------------------
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="A file is required",
            )

        # ----------------------------------------------------
        # Create patient-specific upload directory
        # ----------------------------------------------------
        patient_dir = os.path.join(
            UPLOAD_DIR,
            str(patient.id),
        )

        os.makedirs(
            patient_dir,
            exist_ok=True,
        )

        # ----------------------------------------------------
        # Prevent path traversal
        # ----------------------------------------------------
        safe_filename = Path(
            file.filename
        ).name

        file_path = os.path.join(
            patient_dir,
            safe_filename,
        )

        # ----------------------------------------------------
        # Save uploaded file
        # ----------------------------------------------------
        with open(
            file_path,
            "wb",
        ) as buffer:
            shutil.copyfileobj(
                file.file,
                buffer,
            )

        # ----------------------------------------------------
        # Create document record
        # ----------------------------------------------------
        document = Document(
            patient_id=patient.id,
            file_name=safe_filename,
            file_path=file_path,
            file_type=(
                file.content_type
                or "application/octet-stream"
            ),
            processing_status="processing",
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        # ----------------------------------------------------
        # Process medical document
        # ----------------------------------------------------
        try:
            result = process_document(
                file_path=file_path,
                patient_id=patient.id,
                patient_name=current_user.name,
                document_id=document.id,
            )

            # ------------------------------------------------
            # Mark document as successfully processed
            # ------------------------------------------------
            document.processing_status = "processed"

            # Store the actual extraction method used
            document.extraction_method = (
                result.get("extraction_method")
            )

            db.commit()

        except Exception:
            # -----------------------------------------------
            # Processing failed
            # -----------------------------------------------
            document.processing_status = "failed"

            db.commit()
            raise

        # ----------------------------------------------------
        # Audit successful upload
        # ----------------------------------------------------
        create_audit_log(
            user_id=current_user.id,
            action="UPLOAD_MEDICAL_DOCUMENT",
            resource_type="document",
            resource_id=document.id,
        )

        # ----------------------------------------------------
        # Return upload response
        # ----------------------------------------------------
        return {
            "document_id": document.id,
            "file_name": document.file_name,
            "processing_status": (
                document.processing_status
            ),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {exc}",
        )

    finally:
        db.close()


# ============================================================
# List Patient Documents
# ============================================================

@router.get(
    "/documents",
    response_model=list[DocumentResponse],
)
def get_patient_documents(
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "patient":
        raise HTTPException(
            status_code=403,
            detail="Patient access required",
        )

    db = SessionLocal()

    try:
        # ----------------------------------------------------
        # Get authenticated patient's profile
        # ----------------------------------------------------
        patient = (
            db.query(Patient)
            .filter(
                Patient.user_id == current_user.id
            )
            .first()
        )

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found",
            )

        # ----------------------------------------------------
        # Fetch only this patient's documents
        # ----------------------------------------------------
        documents = (
            db.query(Document)
            .filter(
                Document.patient_id == patient.id
            )
            .order_by(
                Document.uploaded_at.desc()
            )
            .all()
        )

        return [
            {
                "document_id": document.id,
                "file_name": document.file_name,
                "file_type": document.file_type,
                "extraction_method": (
                    document.extraction_method
                ),
                "processing_status": (
                    document.processing_status
                ),
                "uploaded_at": (
                    document.uploaded_at.isoformat()
                    if document.uploaded_at
                    else None
                ),
            }
            for document in documents
        ]

    finally:
        db.close()


# ============================================================
# Patient Appointments
# ============================================================

@router.get("/appointments")
def get_patient_appointments(
    current_user: User = Depends(get_current_user),
):
    """
    Return appointments belonging only to the
    currently authenticated patient.

    Patient ID is derived from the authenticated
    user and is never accepted from the frontend.
    """

    if current_user.role != "patient":
        raise HTTPException(
            status_code=403,
            detail="Patient access required",
        )

    db = SessionLocal()

    try:
        # ----------------------------------------------------
        # Get authenticated patient's profile
        # ----------------------------------------------------
        patient = (
            db.query(Patient)
            .filter(
                Patient.user_id == current_user.id
            )
            .first()
        )

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found",
            )

        # ----------------------------------------------------
        # Fetch only this patient's appointments
        # ----------------------------------------------------
        appointments = (
            db.query(
                Appointment,
                Doctor,
                User,
            )
            .join(
                Doctor,
                Appointment.doctor_id
                == Doctor.id,
            )
            .join(
                User,
                Doctor.user_id
                == User.id,
            )
            .filter(
                Appointment.patient_id
                == patient.id
            )
            .order_by(
                Appointment.appointment_date.asc()
            )
            .all()
        )

        return [
            {
                "id": appointment.id,
                "doctor_name": doctor_user.name,
                "specialization": (
                    doctor.specialization
                ),
                "appointment_date": (
                    appointment.appointment_date.isoformat()
                    if appointment.appointment_date
                    else None
                ),
                "status": appointment.status,
            }
            for (
                appointment,
                doctor,
                doctor_user,
            ) in appointments
        ]

    finally:
        db.close()


# ============================================================
# View Patient Document
# ============================================================

@router.get(
    "/documents/{document_id}/view",
)
def view_patient_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "patient":
        raise HTTPException(
            status_code=403,
            detail="Patient access required",
        )

    db = SessionLocal()

    try:
        # ----------------------------------------------------
        # Get authenticated patient's profile
        # ----------------------------------------------------
        patient = (
            db.query(Patient)
            .filter(
                Patient.user_id == current_user.id
            )
            .first()
        )

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found",
            )

        # ----------------------------------------------------
        # Verify document belongs to authenticated patient
        # ----------------------------------------------------
        document = (
            db.query(Document)
            .filter(
                Document.id == document_id,
                Document.patient_id == patient.id,
            )
            .first()
        )

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found",
            )

        # ----------------------------------------------------
        # Verify file exists
        # ----------------------------------------------------
        file_path = Path(
            document.file_path
        )

        if (
            not file_path.exists()
            or not file_path.is_file()
        ):
            raise HTTPException(
                status_code=404,
                detail="Document file not found",
            )

        # ----------------------------------------------------
        # Determine media type
        # ----------------------------------------------------
        media_type = document.file_type

        if (
            not media_type
            or "/" not in media_type
        ):
            media_type = (
                mimetypes.guess_type(
                    document.file_name
                )[0]
                or "application/octet-stream"
            )

        # ----------------------------------------------------
        # Audit document access
        # ----------------------------------------------------
        create_audit_log(
            user_id=current_user.id,
            action="VIEW_MEDICAL_DOCUMENT",
            resource_type="document",
            resource_id=document.id,
        )

        # ----------------------------------------------------
        # Return document inline
        # ----------------------------------------------------
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            filename=document.file_name,
            content_disposition_type="inline",
        )

    finally:
        db.close()