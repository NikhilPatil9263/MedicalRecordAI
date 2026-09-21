from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from app.db.database import Base


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(
        Integer,
        ForeignKey("documents.id"),
        unique=True,
        nullable=False
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False
    )

    hospital_name = Column(String(255), nullable=True)
    hospital_address = Column(String(500), nullable=True)

    patient_name = Column(String(255), nullable=True)
    age = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)

    study_date = Column(String(50), nullable=True)
    dob = Column(String(50), nullable=True)

    height = Column(String(50), nullable=True)
    weight = Column(String(50), nullable=True)
    bsa = Column(String(50), nullable=True)

    referring_physician = Column(String(255), nullable=True)
    performed_by = Column(String(255), nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )