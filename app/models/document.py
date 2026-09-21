from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from app.db.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False
    )
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    document_type = Column(String(100), nullable=True)
    extraction_method = Column(String(50), nullable=True)
    processing_status = Column(
        String(30),
        default="uploaded",
        nullable=False
    )
    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow
    )