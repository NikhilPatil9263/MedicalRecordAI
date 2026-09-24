from sqlalchemy import Column, Integer, String, ForeignKey

from app.db.database import Base


class Allergy(Base):
    __tablename__ = "allergies"

    id = Column(Integer, primary_key=True, index=True)

    medical_record_id = Column(
        Integer,
        ForeignKey("medical_records.id"),
        nullable=False,
        index=True
    )

    allergen = Column(
        String(255),
        nullable=False
    )

    reaction = Column(
        String(500),
        nullable=True
    )