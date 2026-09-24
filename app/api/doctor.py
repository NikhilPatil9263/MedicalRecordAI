from fastapi import APIRouter, HTTPException, Depends

from app.auth.dependencies import get_current_user

from app.db.database import SessionLocal
from app.db.audit_service import create_audit_log

from app.models.user import User
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.document import Document
from app.models.medical_record import MedicalRecord
from app.models.measurement import Measurement
from app.models.doctor_conversation import DoctorConversation
from app.models.doctor_message import DoctorMessage

from app.schemas.doctor_query import (
    DoctorQueryRequest,
    DoctorQueryResponse,
)

from app.schemas.doctor_profile import (
    DoctorProfileResponse,
    DoctorProfileUpdate,
)

from app.schemas.patient_summary import (
    PatientSummaryResponse,
)

from app.schemas.doctor_conversation import (
    DoctorConversationCreate,
    DoctorPatientConversationGroup,
    DoctorConversationQuery,
)

from app.graph.medical_query_graph import medical_query_graph


router = APIRouter(
    prefix="/doctor",
    tags=["Doctor"]
)


# ============================================================
# GET DOCTOR PROFILE
# ============================================================

@router.get(
    "/profile",
    response_model=DoctorProfileResponse
)
def get_doctor_profile(
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()

    try:

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

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

        return {
            "id": doctor.id,
            "name": current_user.name,
            "email": current_user.email,
            "specialization": doctor.specialization,
        }

    finally:
        db.close()


# ============================================================
# UPDATE DOCTOR PROFILE
# ============================================================

@router.put(
    "/profile",
    response_model=DoctorProfileResponse
)
def update_doctor_profile(
    request: DoctorProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()

    try:

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

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

        existing_user = (
            db.query(User)
            .filter(
                User.email == request.email,
                User.id != current_user.id
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email is already in use"
            )

        user = (
            db.query(User)
            .filter(
                User.id == current_user.id
            )
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        user.name = request.name
        user.email = request.email

        doctor.specialization = request.specialization

        db.commit()

        return {
            "id": doctor.id,
            "name": user.name,
            "email": user.email,
            "specialization": doctor.specialization,
        }

    finally:
        db.close()


# ============================================================
# GET DOCTOR APPOINTMENTS
# ============================================================

@router.get("/appointments")
def get_doctor_appointments(
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()

    try:

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

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

        appointments = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == doctor.id
            )
            .order_by(
                Appointment.appointment_date.asc()
            )
            .all()
        )

        

        return [
            {
                "id": appointment.id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "appointment_date": (
                    appointment.appointment_date.isoformat()
                    if appointment.appointment_date
                    else None
                ),
                "status": appointment.status,
            }
            for appointment in appointments
        ]

    finally:
        db.close()


# ============================================================
# CREATE DOCTOR CONVERSATION
# ============================================================

@router.post("/conversations")
def create_doctor_conversation(
    request: DoctorConversationCreate,
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()

    try:

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

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
        # VERIFY APPOINTMENT BELONGS TO THIS DOCTOR
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
        # PATIENT COMES FROM VERIFIED APPOINTMENT
        # ----------------------------------------------------

        patient_id = appointment.patient_id

        conversation = DoctorConversation(
            doctor_id=doctor.id,
            patient_id=patient_id,
            appointment_id=appointment.id,
            title=request.title.strip() or "New Conversation",
        )

        db.add(conversation)
        db.commit()
        db.refresh(conversation)

        create_audit_log(
            user_id=current_user.id,
            action="CREATE_DOCTOR_CONVERSATION",
            resource_type="conversation",
            resource_id=conversation.id,
        )

        return {
            "id": conversation.id,
            "patient_id": conversation.patient_id,
            "appointment_id": conversation.appointment_id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
        }

    finally:
        db.close()


# ============================================================
# GET DOCTOR PATIENTS WITH CONVERSATIONS
# ============================================================

@router.get(
    "/patients",
    response_model=list[DoctorPatientConversationGroup]
)
def get_doctor_patients(
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()

    try:

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

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
        # GET PATIENTS FROM THIS DOCTOR'S APPOINTMENTS
        # ----------------------------------------------------

        appointments = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == doctor.id
            )
            .all()
        )

        patient_ids = list(
            {
                appointment.patient_id
                for appointment in appointments
            }
        )

        if not patient_ids:
            return []

        patients = (
            db.query(Patient)
            .filter(
                Patient.id.in_(patient_ids)
            )
            .all()
        )

        result = []

        for patient in patients:

            patient_user = (
                db.query(User)
                .filter(
                    User.id == patient.user_id
                )
                .first()
            )

            patient_name = (
                patient_user.name
                if patient_user
                else None
            )

            conversations = (
                db.query(DoctorConversation)
                .filter(
                    DoctorConversation.doctor_id == doctor.id,
                    DoctorConversation.patient_id == patient.id
                )
                .order_by(
                    DoctorConversation.updated_at.desc()
                )
                .all()
            )

            conversation_items = [
                {
                    "id": conversation.id,
                    "title": conversation.title,
                    "created_at": conversation.created_at,
                    "updated_at": conversation.updated_at,
                }
                for conversation in conversations
            ]

            result.append(
                {
                    "patient_id": patient.id,
                    "patient_name": patient_name,
                    "conversations": conversation_items,
                }
            )

        return result

    finally:
        db.close()


# ============================================================
# GET SINGLE DOCTOR CONVERSATION
# ============================================================

@router.get("/conversations/{conversation_id}")
def get_doctor_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
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
        # GET ONLY THIS DOCTOR'S CONVERSATION
        # ----------------------------------------------------

        conversation = (
            db.query(DoctorConversation)
            .filter(
                DoctorConversation.id == conversation_id,
                DoctorConversation.doctor_id == doctor.id,
            )
            .first()
        )

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )

        # ----------------------------------------------------
        # GET MESSAGES
        # ----------------------------------------------------

        messages = (
            db.query(DoctorMessage)
            .filter(
                DoctorMessage.conversation_id == conversation.id
            )
            .order_by(
                DoctorMessage.created_at.asc()
            )
            .all()
        )

        return {
            "id": conversation.id,
            "patient_id": conversation.patient_id,
            "appointment_id": conversation.appointment_id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "messages": [
                {
                    "id": message.id,
                    "role": message.role,
                    "content": message.content,
                    "sources": (
                        message.sources.split("\n")
                        if message.sources
                        else []
                    ),
                    "created_at": message.created_at,
                }
                for message in messages
            ],
        }

    finally:
        db.close()


# ============================================================
# QUERY INSIDE DOCTOR CONVERSATION
# ============================================================

@router.post("/conversations/{conversation_id}/query")
def query_doctor_conversation(
    conversation_id: int,
    request: DoctorConversationQuery,
    current_user: User = Depends(get_current_user),
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
        # GET CONVERSATION
        # ----------------------------------------------------

        conversation = (
            db.query(DoctorConversation)
            .filter(
                DoctorConversation.id == conversation_id,
                DoctorConversation.doctor_id == doctor.id,
            )
            .first()
        )

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )
        

        # ----------------------------------------------------
        # VERIFY APPOINTMENT
        #
        # This provides an additional authorization check.
        # ----------------------------------------------------

        appointment = (
            db.query(Appointment)
            .filter(
                Appointment.id == conversation.appointment_id,
                Appointment.doctor_id == doctor.id,
                Appointment.patient_id == conversation.patient_id,
            )
            .first()
        )

        if not appointment:
            raise HTTPException(
                status_code=403,
                detail="Conversation is not associated with an authorized appointment"
            )

        # ----------------------------------------------------
        # VALIDATE QUERY
        # ----------------------------------------------------

        query_text = request.query.strip()

        if not query_text:
            raise HTTPException(
                status_code=400,
                detail="Query cannot be empty"
            )

        # ----------------------------------------------------
        # SAVE DOCTOR MESSAGE
        # ----------------------------------------------------

        doctor_message = DoctorMessage(
            conversation_id=conversation.id,
            role="doctor",
            content=query_text,
            sources=None,
        )

        db.add(doctor_message)
        db.commit()
        db.refresh(doctor_message)

        # ----------------------------------------------------
        # RUN EXISTING MEDICAL QUERY GRAPH
        #
        # IMPORTANT:
        # patient_id comes from the verified conversation.
        # It does NOT come from frontend input.
        # ----------------------------------------------------

        result = medical_query_graph.invoke(
            {
                "query": query_text,
                "patient_id": conversation.patient_id,
            }
        )

        generated_response = result["generated_response"]

        # ----------------------------------------------------
        # EXTRACT SOURCES
        # ----------------------------------------------------

        response_sources = []

        if isinstance(generated_response, dict):
            response_sources = generated_response.get(
                "sources",
                []
            )

        # If the graph returns a structured response
        # containing summary + sources, keep the complete
        # generated response as the message content.
        if isinstance(generated_response, dict):
            assistant_content = generated_response.get(
                "summary",
                str(generated_response)
            )
        else:
            assistant_content = str(generated_response)

        # ----------------------------------------------------
        # SAVE ASSISTANT MESSAGE
        # ----------------------------------------------------

        assistant_message = DoctorMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_content,
            sources="\n".join(
                response_sources
            ) if response_sources else None,
        )

        db.add(assistant_message)

        # ----------------------------------------------------
        # UPDATE CONVERSATION TIMESTAMP
        # ----------------------------------------------------

        conversation.updated_at = (
            __import__("datetime")
            .datetime.utcnow()
        )

        db.commit()

        db.refresh(assistant_message)
        db.refresh(conversation)

        # ----------------------------------------------------
        # AUDIT LOG
        # ----------------------------------------------------

        create_audit_log(
            user_id=current_user.id,
            action="QUERY_DOCTOR_CONVERSATION",
            resource_type="conversation",
            resource_id=conversation.id,
        )

        # ----------------------------------------------------
        # RETURN RESPONSE
        # ----------------------------------------------------

        return {
            "conversation_id": conversation.id,
            "patient_id": conversation.patient_id,
            "appointment_id": conversation.appointment_id,
            "message": {
                "id": assistant_message.id,
                "role": assistant_message.role,
                "content": assistant_message.content,
                "sources": response_sources,
                "created_at": assistant_message.created_at,
            },
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# ============================================================
# DELETE DOCTOR CONVERSATION
# ============================================================

@router.delete("/conversations/{conversation_id}")
def delete_doctor_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
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
        # FIND CONVERSATION
        #
        # The conversation must belong to the
        # authenticated doctor.
        # ----------------------------------------------------

        conversation = (
            db.query(DoctorConversation)
            .filter(
                DoctorConversation.id == conversation_id,
                DoctorConversation.doctor_id == doctor.id,
            )
            .first()
        )

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )

        # ----------------------------------------------------
        # DELETE ALL MESSAGES FIRST
        #
        # doctor_messages references doctor_conversations,
        # so messages are explicitly removed before the
        # parent conversation.
        # ----------------------------------------------------

        db.query(DoctorMessage).filter(
            DoctorMessage.conversation_id == conversation.id
        ).delete(
            synchronize_session=False
        )

        # ----------------------------------------------------
        # DELETE CONVERSATION
        # ----------------------------------------------------

        db.delete(conversation)
        db.commit()

        # ----------------------------------------------------
        # AUDIT LOG
        # ----------------------------------------------------

        create_audit_log(
            user_id=current_user.id,
            action="DELETE_DOCTOR_CONVERSATION",
            resource_type="conversation",
            resource_id=conversation_id,
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {
            "message": "Conversation deleted successfully.",
            "conversation_id": conversation_id,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()



# ============================================================
# GET PATIENT SUMMARY
# ============================================================

@router.get(
    "/appointments/{appointment_id}/summary",
    response_model=PatientSummaryResponse
)
def get_patient_summary(
    appointment_id: int,
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()

    try:

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

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

        appointment = (
            db.query(Appointment)
            .filter(
                Appointment.id == appointment_id,
                Appointment.doctor_id == doctor.id
            )
            .first()
        )

        if not appointment:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found"
            )

        patient = (
            db.query(Patient)
            .filter(
                Patient.id == appointment.patient_id
            )
            .first()
        )

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        patient_user = (
            db.query(User)
            .filter(
                User.id == patient.user_id
            )
            .first()
        )

        medical_records = (
            db.query(MedicalRecord)
            .filter(
                MedicalRecord.patient_id == patient.id
            )
            .order_by(
                MedicalRecord.created_at.desc()
            )
            .all()
        )

        medical_record_ids = [
            record.id
            for record in medical_records
        ]

        measurements = []

        if medical_record_ids:

            measurements = (
                db.query(Measurement)
                .filter(
                    Measurement.medical_record_id.in_(
                        medical_record_ids
                    )
                )
                .all()
            )

        medical_history = []
        medications = []
        investigations = []
        allergies = []

        for measurement in measurements:

            item = {
                "parameter": measurement.parameter,
                "value": measurement.value,
                "unit": measurement.unit,
                "source_document": measurement.source_document,
                "page_number": measurement.page_number,
            }

            category = (
                measurement.category or ""
            ).strip().lower()

            if category in [
                "diagnosis",
                "medical history",
                "history",
                "condition",
                "conditions",
            ]:

                medical_history.append(item)

            elif category in [
                "medication",
                "medications",
                "medicine",
                "medicines",
            ]:

                medications.append(item)

            elif category in [
                "investigation",
                "investigations",
                "lab",
                "labs",
                "test",
                "tests",
            ]:

                investigations.append(item)

            elif category in [
                "allergy",
                "allergies",
            ]:

                allergies.append(item)

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

        recent_reports = [
            {
                "id": document.id,
                "file_name": document.file_name,
                "document_type": document.document_type,
                "uploaded_at": (
                    document.uploaded_at.isoformat()
                    if document.uploaded_at
                    else None
                ),
            }
            for document in documents
        ]

        patient_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.patient_id == patient.id
            )
            .order_by(
                Appointment.appointment_date.desc()
            )
            .all()
        )

        appointments = [
            {
                "id": item.id,
                "appointment_date": (
                    item.appointment_date.isoformat()
                    if item.appointment_date
                    else None
                ),
                "status": item.status,
            }
            for item in patient_appointments
        ]

        patient_name = (
            patient_user.name
            if patient_user
            else None
        )

        age = None
        gender = patient.gender

        if medical_records:

            latest_record = medical_records[0]

            age = latest_record.age

            if not gender:
                gender = latest_record.gender

            if not patient_name:
                patient_name = latest_record.patient_name

        return {
            "patient": {
                "id": patient.id,
                "name": patient_name,
                "age": age,
                "gender": gender,
            },
            "medical_history": medical_history,
            "medications": medications,
            "investigations": investigations,
            "allergies": allergies,
            "recent_reports": recent_reports,
            "appointments": appointments,
        }

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

        if current_user.role != "doctor":
            raise HTTPException(
                status_code=403,
                detail="Doctor access required"
            )

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
        # PATIENT ID COMES FROM VERIFIED APPOINTMENT
        # ----------------------------------------------------

        patient_id = appointment.patient_id

        result = medical_query_graph.invoke(
            {
                "query": request.query,
                "patient_id": patient_id,
            }
        )

        create_audit_log(
            user_id=current_user.id,
            action="QUERY_MEDICAL_RECORDS",
            resource_type="appointment",
            resource_id=appointment.id,
        )

        return {
            "patient_id": patient_id,
            "response": result["generated_response"],
        }

    finally:
        db.close()