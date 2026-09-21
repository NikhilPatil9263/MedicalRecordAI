from app.schemas.medical_record import MedicalRecord


def medical_record_to_text(
    medical_record: MedicalRecord
) -> str:
    """
    Convert a normalized MedicalRecord into concise
    searchable text for vector retrieval.
    """

    lines = []

    # Hospital information
    hospital = medical_record.hospital_information

    if hospital.name:
        lines.append(
            f"Hospital: {hospital.name}"
        )

    if hospital.address:
        lines.append(
            f"Hospital Address: {hospital.address}"
        )

    # Patient information
    patient = medical_record.patient_demographics

    if patient.name:
        lines.append(
            f"Patient Name: {patient.name}"
        )

    if patient.age:
        lines.append(
            f"Age: {patient.age}"
        )

    if patient.gender:
        lines.append(
            f"Gender: {patient.gender}"
        )

    if patient.study_date:
        lines.append(
            f"Study Date: {patient.study_date}"
        )

    if patient.dob:
        lines.append(
            f"Date of Birth: {patient.dob}"
        )

    if patient.ht:
        lines.append(
            f"Height: {patient.ht}"
        )

    if patient.wt:
        lines.append(
            f"Weight: {patient.wt}"
        )

    if patient.bsa:
        lines.append(
            f"BSA: {patient.bsa}"
        )

    if patient.referring_physician:
        lines.append(
            f"Referring Physician: "
            f"{patient.referring_physician}"
        )

    if patient.performed_by:
        lines.append(
            f"Performed By: {patient.performed_by}"
        )

    # Medical measurements
    for measurement in medical_record.measurements:

        value = measurement.value or ""
        unit = measurement.unit or ""

        lines.append(
            f"{measurement.category}: "
            f"{measurement.parameter} = "
            f"{value} {unit}".strip()
        )

    return "\n".join(lines)