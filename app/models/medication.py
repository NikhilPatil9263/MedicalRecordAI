from sqlalchemy import Column, Integer, String, ForeignKey

from app.db.database import Base


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)

    medical_record_id = Column(
        Integer,
        ForeignKey("medical_records.id"),
        nullable=False,
        index=True
    )

    name = Column(
        String(255),
        nullable=False
    )

    dose = Column(
        String(100),
        nullable=True
    )

    frequency = Column(
        String(100),
        nullable=True
    )

    details = Column(
        String(1000),
        nullable=True
    )