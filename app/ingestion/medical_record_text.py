from app.schemas.medical_record import MedicalRecord


def medical_record_to_text(record: MedicalRecord) -> str:
    lines = []

    if record.hospital_information.name:
        lines.append(
            f"Hospital: {record.hospital_information.name}"
        )

    if record.patient_demographics.name:
        lines.append(
            f"Patient Name: {record.patient_demographics.name}"
        )

    if record.patient_demographics.age:
        lines.append(
            f"Age: {record.patient_demographics.age}"
        )

    if record.patient_demographics.gender:
        lines.append(
            f"Gender: {record.patient_demographics.gender}"
        )

    if record.patient_demographics.study_date:
        lines.append(
            f"Study Date: {record.patient_demographics.study_date}"
        )

    lines.append("Medical Measurements:")

    for measurement in record.measurements:
        value = measurement.value or "Unknown"
        unit = measurement.unit or ""

        lines.append(
            f"{measurement.category} - "
            f"{measurement.parameter}: "
            f"{value} {unit}"
        )

    return "\n".join(lines)