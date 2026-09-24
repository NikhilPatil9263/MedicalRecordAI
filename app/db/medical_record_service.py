from app.db.database import SessionLocal

# Import SQLAlchemy models
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.appointment import Appointment
from app.models.document import Document
from app.models.medical_record import MedicalRecord
from app.models.measurement import Measurement
from app.models.medical_history import MedicalHistory
from app.models.diagnosis import Diagnosis
from app.models.medication import Medication
from app.models.allergy import Allergy
from app.models.investigation import Investigation

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
        # -----------------------------------------
        # Create main medical record
        # -----------------------------------------
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

        # Generate medical_record ID
        db.flush()

        # -----------------------------------------
        # Save medical history
        # -----------------------------------------
        for history in medical_record.medical_history:

            db_history = MedicalHistory(
                medical_record_id=db_record.id,
                condition=history.condition,
                details=history.details,
            )

            db.add(db_history)

        # -----------------------------------------
        # Save diagnoses
        # -----------------------------------------
        for diagnosis in medical_record.diagnoses:

            db_diagnosis = Diagnosis(
                medical_record_id=db_record.id,
                condition=diagnosis.condition,
                details=diagnosis.details,
            )

            db.add(db_diagnosis)

        # -----------------------------------------
        # Save medications
        # -----------------------------------------
        for medication in medical_record.medications:

            db_medication = Medication(
                medical_record_id=db_record.id,
                name=medication.name,
                dose=medication.dose,
                frequency=medication.frequency,
                details=medication.details,
            )

            db.add(db_medication)

        # -----------------------------------------
        # Save allergies
        # -----------------------------------------
        for allergy in medical_record.allergies:

            db_allergy = Allergy(
                medical_record_id=db_record.id,
                allergen=allergy.allergen,
                reaction=allergy.reaction,
            )

            db.add(db_allergy)

        # -----------------------------------------
        # Save investigations
        # -----------------------------------------
        for investigation in medical_record.investigations:

            db_investigation = Investigation(
                medical_record_id=db_record.id,
                name=investigation.name,
                date=investigation.date,
                findings=investigation.findings,
            )

            db.add(db_investigation)

        # -----------------------------------------
        # Save measurements
        # -----------------------------------------
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

        # -----------------------------------------
        # Commit everything together
        # -----------------------------------------
        db.commit()

        return db_record.id

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()