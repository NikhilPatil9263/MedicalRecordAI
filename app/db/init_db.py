from app.db.database import Base, engine
from app.models.audit_log import AuditLog

from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.appointment import Appointment
from app.models.document import Document
from app.models.medical_record import MedicalRecord
from app.models.measurement import Measurement


Base.metadata.create_all(bind=engine)