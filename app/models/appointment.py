from sqlalchemy import Column, Integer, DateTime, String, ForeignKey
from datetime import datetime

from app.db.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    status = Column(String(20), default="scheduled", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)