from app.db.database import SessionLocal

# Import all SQLAlchemy models so their tables
# are registered in the same Base.metadata.
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.appointment import Appointment
from app.models.document import Document
from app.models.medical_record import MedicalRecord
from app.models.measurement import Measurement

from app.schemas.medical_record import (
    MedicalRecord as MedicalRecordSchema
)


def save_medical_record(
    medical_record: MedicalRecordSchema,
    document_id: int,
    patient_id: int,
) -> int:

    db = SessionLocal()

    try:
        # Create the main medical record
        db_record = MedicalRecord(
            document_id=document_id,
            patient_id=patient_id,

            hospital_name=(
                medical_record.hospital_information.name
            ),

            hospital_address=(
                medical_record.hospital_information.address
            ),

            patient_name=(
                medical_record.patient_demographics.name
            ),

            age=(
                medical_record.patient_demographics.age
            ),

            gender=(
                medical_record.patient_demographics.gender
            ),

            study_date=(
                medical_record.patient_demographics.study_date
            ),

            dob=(
                medical_record.patient_demographics.dob
            ),

            height=(
                medical_record.patient_demographics.ht
            ),

            weight=(
                medical_record.patient_demographics.wt
            ),

            bsa=(
                medical_record.patient_demographics.bsa
            ),

            referring_physician=(
                medical_record.patient_demographics.referring_physician
            ),

            performed_by=(
                medical_record.patient_demographics.performed_by
            ),
        )

        db.add(db_record)

        # Generate the medical_record ID
        db.flush()

        # Save each measurement
        for measurement in medical_record.measurements:

            db_measurement = Measurement(
                medical_record_id=db_record.id,
                category=measurement.category,
                parameter=measurement.parameter,
                value=measurement.value,
                unit=measurement.unit,
                source_document=measurement.source_document,
                page_number=measurement.page_number,
            )

            db.add(db_measurement)

        # Commit everything together
        db.commit()

        return db_record.id

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()