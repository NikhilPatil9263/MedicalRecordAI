from fastapi import APIRouter, HTTPException, Depends

from app.auth.dependencies import get_current_user

from app.db.database import SessionLocal
from app.db.audit_service import create_audit_log

from app.models.user import User
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.appointment import Appointment

from app.schemas.doctor_query import (
    DoctorQueryRequest,
    DoctorQueryResponse,
)

from app.graph.medical_query_graph import medical_query_graph


router = APIRouter(
    prefix="/doctor",
    tags=["Doctor"]
)


# ============================================================
# GET DOCTOR APPOINTMENTS
# ============================================================

@router.get("/appointments")
def get_doctor_appointments(
    current_user: User = Depends(get_current_user)
):

    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # ROLE CHECK
        # ----------------------------------------------------

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

        # ----------------------------------------------------
        # FIND DOCTOR PROFILE
        # ----------------------------------------------------

        doctor = (
            db.query(Doctor)
            .filter(
                Doctor.user_id == current_user.id
            )
            .first()
        )

        if not doctor:
            raise HTTPException(
                status_code=404,
                detail="Doctor profile not found"
            )

        # ----------------------------------------------------
        # GET DOCTOR APPOINTMENTS
        # ----------------------------------------------------

        appointments = (
            db.query(
                Appointment,
                Patient,
                User
            )
            .join(
                Patient,
                Appointment.patient_id == Patient.id
            )
            .join(
                User,
                Patient.user_id == User.id
            )
            .filter(
                Appointment.doctor_id == doctor.id
            )
            .order_by(
                Appointment.appointment_date.asc()
            )
            .all()
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return [
            {
                "id": appointment.id,
                "patient_id": appointment.patient_id,
                "patient_name": patient_user.name,
                "doctor_id": appointment.doctor_id,
                "appointment_date": (
                    appointment.appointment_date.isoformat()
                    if appointment.appointment_date
                    else None
                ),
                "status": appointment.status,
            }
            for appointment, patient, patient_user
            in appointments
        ]

    finally:
        db.close()


# ============================================================
# DOCTOR MEDICAL RECORD QUERY
# ============================================================

@router.post(
    "/query",
    response_model=DoctorQueryResponse
)
def doctor_query(
    request: DoctorQueryRequest,
    current_user: User = Depends(get_current_user)
):

    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # ROLE CHECK
        # ----------------------------------------------------

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

        # ----------------------------------------------------
        # FIND DOCTOR
        # ----------------------------------------------------

        doctor = (
            db.query(Doctor)
            .filter(
                Doctor.user_id == current_user.id
            )
            .first()
        )

        if not doctor:
            raise HTTPException(
                status_code=404,
                detail="Doctor profile not found"
            )

        # ----------------------------------------------------
        # VERIFY APPOINTMENT OWNERSHIP
        # ----------------------------------------------------

        appointment = (
            db.query(Appointment)
            .filter(
                Appointment.id == request.appointment_id,
                Appointment.doctor_id == doctor.id
            )
            .first()
        )

        if not appointment:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found"
            )

        # ----------------------------------------------------
        # DERIVE PATIENT ID SECURELY
        # ----------------------------------------------------

        patient_id = appointment.patient_id

        # ----------------------------------------------------
        # RUN LANGGRAPH
        # ----------------------------------------------------

        result = medical_query_graph.invoke(
            {
                "query": request.query,
                "patient_id": patient_id,
            }
        )

        # ----------------------------------------------------
        # AUDIT LOG
        # ----------------------------------------------------

        create_audit_log(
            user_id=current_user.id,
            action="QUERY_MEDICAL_RECORDS",
            resource_type="appointment",
            resource_id=appointment.id,
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {
            "patient_id": patient_id,
            "response": result["generated_response"],
        }

    finally:
        db.close()