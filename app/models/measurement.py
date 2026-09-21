from sqlalchemy import Column, Integer, String, ForeignKey

from app.db.database import Base


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)

    medical_record_id = Column(
        Integer,
        ForeignKey("medical_records.id"),
        nullable=False
    )

    category = Column(String(100), nullable=False)

    parameter = Column(String(255), nullable=False)

    value = Column(String(255), nullable=True)

    unit = Column(String(50), nullable=True)

    source_document = Column(String(255), nullable=True)

    page_number = Column(Integer, nullable=True)