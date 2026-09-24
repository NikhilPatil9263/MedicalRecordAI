from sqlalchemy import Column, Integer, String, ForeignKey

from app.db.database import Base


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)

    medical_record_id = Column(
        Integer,
        ForeignKey("medical_records.id"),
        nullable=False,
        index=True
    )

    condition = Column(
        String(255),
        nullable=False
    )

    details = Column(
        String(1000),
        nullable=True
    )