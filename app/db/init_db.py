from app.db.database import Base, engine
from app.models.audit_log import AuditLog
from app.models.doctor_conversation import DoctorConversation
from app.models.doctor_message import DoctorMessage
from app.models.doctor_conversation import DoctorConversation
from app.models.doctor_message import DoctorMessage
from app.models.patient_doctor_message import PatientDoctorMessage

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

Base.metadata.create_all(bind=engine)