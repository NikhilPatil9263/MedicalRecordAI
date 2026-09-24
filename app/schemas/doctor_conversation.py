from datetime import datetime

from pydantic import BaseModel


# ============================================================
# CREATE CONVERSATION
# ============================================================

class DoctorConversationCreate(BaseModel):
    appointment_id: int
    title: str = "New Conversation"


# ============================================================
# MESSAGE RESPONSE
# ============================================================

class DoctorMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: list[str] = []
    created_at: datetime


# ============================================================
# CONVERSATION LIST RESPONSE
# ============================================================

class DoctorConversationListItem(BaseModel):
    id: int
    patient_id: int
    appointment_id: int
    title: str
    created_at: datetime
    updated_at: datetime


# ============================================================
# FULL CONVERSATION RESPONSE
# ============================================================

class DoctorConversationResponse(BaseModel):
    id: int
    patient_id: int
    appointment_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[DoctorMessageResponse]


# ============================================================
# QUERY INSIDE CONVERSATION
# ============================================================

class DoctorConversationQuery(BaseModel):
    query: str
# ============================================================
# PATIENT CONVERSATION ITEM
# ============================================================

class DoctorPatientConversationItem(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


# ============================================================
# PATIENT WITH CONVERSATIONS
# ============================================================

class DoctorPatientConversationGroup(BaseModel):
    patient_id: int
    patient_name: str | None
    conversations: list[DoctorPatientConversationItem]
