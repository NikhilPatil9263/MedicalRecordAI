from app.schemas.medical_record import MedicalRecord


def chunk_medical_record(
    record: MedicalRecord,
    measurements_per_chunk: int = 8,
) -> list[str]:

    chunks = []

    # Basic patient/document context
    context_lines = []

    if record.hospital_information.name:
        context_lines.append(
            f"Hospital: {record.hospital_information.name}"
        )

    if record.patient_demographics.name:
        context_lines.append(
            f"Patient Name: {record.patient_demographics.name}"
        )

    if record.patient_demographics.age:
        context_lines.append(
            f"Age: {record.patient_demographics.age}"
        )

    if record.patient_demographics.gender:
        context_lines.append(
            f"Gender: {record.patient_demographics.gender}"
        )

    if record.patient_demographics.study_date:
        context_lines.append(
            f"Study Date: {record.patient_demographics.study_date}"
        )

    # Create chunks using complete measurements
    for start in range(
        0,
        len(record.measurements),
        measurements_per_chunk,
    ):
        measurement_lines = []

        for measurement in record.measurements[
            start:start + measurements_per_chunk
        ]:
            value = measurement.value or "Unknown"
            unit = measurement.unit or ""

            measurement_lines.append(
                f"{measurement.category} - "
                f"{measurement.parameter}: "
                f"{value} {unit}"
            )

        chunk = "\n".join(
            context_lines
            + ["Medical Measurements:"]
            + measurement_lines
        )

        chunks.append(chunk)

    return chunks