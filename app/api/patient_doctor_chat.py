import secrets
import threading
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import SessionLocal
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.patient_doctor_message import PatientDoctorMessage
from app.models.user import User


router = APIRouter(tags=["Patient Doctor Chat"])


class ChatSessionRequest(BaseModel):
    appointment_id: int


class ChatSessionResponse(BaseModel):
    ticket: str
    appointment_id: int
    expires_in: int


class ChatMessageResponse(BaseModel):
    id: int
    appointment_id: int
    sender_role: str
    sender_user_id: int
    content: str
    created_at: Any


# Local-development ticket store. The ticket is short-lived and is created
# only after the normal JWT-protected REST endpoint authorizes the user.
_TICKET_TTL_SECONDS = 300
_tickets: dict[str, tuple[int, str, int, float]] = {}
_ticket_lock = threading.Lock()


class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[int, set[WebSocket]] = {}
        self.user_context: dict[WebSocket, tuple[int, str, int, int]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        appointment_id: int,
        user_id: int,
        role: str,
        doctor_id: int,
        patient_id: int,
    ) -> None:
        await websocket.accept()
        self.active.setdefault(appointment_id, set()).add(websocket)
        self.user_context[websocket] = (
            user_id,
            role,
            doctor_id,
            patient_id,
        )

    def disconnect(self, websocket: WebSocket, appointment_id: int) -> None:
        sockets = self.active.get(appointment_id)
        if sockets:
            sockets.discard(websocket)
            if not sockets:
                self.active.pop(appointment_id, None)
        self.user_context.pop(websocket, None)

    async def broadcast(self, appointment_id: int, payload: dict) -> None:
        sockets = list(self.active.get(appointment_id, set()))
        dead: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:
                dead.append(socket)

        for socket in dead:
            self.disconnect(socket, appointment_id)


manager = ConnectionManager()


def _get_appointment_for_user(
    db: Session,
    current_user: User,
    appointment_id: int,
) -> tuple[Appointment, Doctor, Patient, str]:
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
    patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()

    if not doctor or not patient:
        raise HTTPException(status_code=404, detail="Appointment participants not found")

    if current_user.role == "doctor":
        if doctor.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You are not assigned to this appointment")
        role = "doctor"
    elif current_user.role == "patient":
        if patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="This appointment does not belong to you")
        role = "patient"
    else:
        raise HTTPException(status_code=403, detail="Doctor or patient access required")

    return appointment, doctor, patient, role


def _cleanup_tickets() -> None:
    now = time.time()
    expired = [token for token, value in _tickets.items() if value[3] <= now]
    for token in expired:
        _tickets.pop(token, None)


@router.post("/chat/session", response_model=ChatSessionResponse)
def create_chat_session(
    request: ChatSessionRequest,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        appointment, doctor, patient, role = _get_appointment_for_user(
            db,
            current_user,
            request.appointment_id,
        )

        token = secrets.token_urlsafe(32)
        expires_at = time.time() + _TICKET_TTL_SECONDS

        with _ticket_lock:
            _cleanup_tickets()
            _tickets[token] = (
                current_user.id,
                role,
                doctor.id,
                patient.id,
                expires_at,
            )

        return {
            "ticket": token,
            "appointment_id": appointment.id,
            "expires_in": _TICKET_TTL_SECONDS,
        }
    finally:
        db.close()


@router.get("/chat/{appointment_id}/messages", response_model=list[ChatMessageResponse])
def get_chat_messages(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        _get_appointment_for_user(db, current_user, appointment_id)

        messages = (
            db.query(PatientDoctorMessage)
            .filter(PatientDoctorMessage.appointment_id == appointment_id)
            .order_by(PatientDoctorMessage.created_at.asc())
            .all()
        )

        return messages
    finally:
        db.close()


def _resolve_ticket(ticket: str) -> tuple[int, str, int, int] | None:
    with _ticket_lock:
        _cleanup_tickets()
        value = _tickets.pop(ticket, None)

    if not value:
        return None

    user_id, role, doctor_id, patient_id, expires_at = value
    if expires_at <= time.time():
        return None

    return user_id, role, doctor_id, patient_id


@router.websocket("/ws/chat/{appointment_id}")
async def websocket_chat(
    websocket: WebSocket,
    appointment_id: int,
    ticket: str = Query(...),
):
    context = _resolve_ticket(ticket)
    if not context:
        await websocket.close(code=1008, reason="Invalid or expired chat ticket")
        return

    user_id, role, doctor_id, patient_id = context

    db = SessionLocal()
    try:
        appointment = (
            db.query(Appointment)
            .filter(
                Appointment.id == appointment_id,
                Appointment.doctor_id == doctor_id,
                Appointment.patient_id == patient_id,
            )
            .first()
        )

        if not appointment:
            await websocket.close(code=1008, reason="Unauthorized appointment")
            return
    finally:
        db.close()

    await manager.connect(
        websocket,
        appointment_id,
        user_id,
        role,
        doctor_id,
        patient_id,
    )

    await websocket.send_json({
        "type": "connected",
        "appointment_id": appointment_id,
        "role": role,
    })

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") != "message":
                continue

            content = str(data.get("content") or "").strip()
            if not content:
                await websocket.send_json({
                    "type": "error",
                    "message": "Message cannot be empty.",
                })
                continue

            if len(content) > 2000:
                await websocket.send_json({
                    "type": "error",
                    "message": "Message is too long. Maximum 2000 characters.",
                })
                continue

            db = SessionLocal()
            try:
                message = PatientDoctorMessage(
                    appointment_id=appointment_id,
                    doctor_id=doctor_id,
                    patient_id=patient_id,
                    sender_user_id=user_id,
                    sender_role=role,
                    content=content,
                )
                db.add(message)
                db.commit()
                db.refresh(message)

                payload = {
                    "type": "message",
                    "message": {
                        "id": message.id,
                        "appointment_id": message.appointment_id,
                        "sender_role": message.sender_role,
                        "sender_user_id": message.sender_user_id,
                        "content": message.content,
                        "created_at": message.created_at.isoformat(),
                    },
                }
            except Exception:
                db.rollback()
                await websocket.send_json({
                    "type": "error",
                    "message": "Message could not be saved.",
                })
                continue
            finally:
                db.close()

            await manager.broadcast(appointment_id, payload)

    except WebSocketDisconnect:
        manager.disconnect(websocket, appointment_id)
    except Exception:
        manager.disconnect(websocket, appointment_id)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
