from datetime import datetime

from app.db.database import SessionLocal
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.appointment import Appointment
from app.auth.security import hash_password


db = SessionLocal()

try:
    # Patient user
    patient_user = User(
        name="Manikandan",
        email="manikandan@test.com",
        password_hash=hash_password("test123"),
        role="patient",
    )

    # Doctor user
    doctor_user = User(
        name="Dr. Test Doctor",
        email="doctor@test.com",
        password_hash=hash_password("test123"),
        role="doctor",
    )

    db.add_all([
        patient_user,
        doctor_user,
    ])

    db.commit()

    db.refresh(patient_user)
    db.refresh(doctor_user)

    # Patient
    patient = Patient(
        user_id=patient_user.id,
        date_of_birth=None,
        gender="M",
    )

    # Doctor
    doctor = Doctor(
        user_id=doctor_user.id,
        specialization="Cardiology",
    )

    db.add_all([
        patient,
        doctor,
    ])

    db.commit()

    db.refresh(patient)
    db.refresh(doctor)

    # Appointment
    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=datetime(2026, 9, 16, 10, 0),
        status="scheduled",
    )

    db.add(appointment)
    db.commit()

    print("----- SEED DATA CREATED -----")
    print(f"Patient ID: {patient.id}")
    print(f"Doctor ID: {doctor.id}")
    print(f"Appointment ID: {appointment.id}")

finally:
    db.close()