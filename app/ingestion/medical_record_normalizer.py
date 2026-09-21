from app.schemas.medical_record import (
    MedicalRecord,
    HospitalInformation,
    PatientDemographics,
    Measurement,
)


def normalize_medical_record(
    raw_data: dict,
    source_document: str | None = None,
    page_number: int | None = None,
) -> MedicalRecord:
    measurements = []

    measurement_sections = {
        "2d": "2D",
        "2D": "2D",
        "mmode": "MMode",
        "MMode": "MMode",
    }

    raw_measurement_data = raw_data.get(
        "echocardiography_measurements", {}
    )

    for section_name, category in measurement_sections.items():

        section_data = raw_measurement_data.get(section_name)

        if not section_data:
            continue

        for parameter, measurement in section_data.items():

            if not isinstance(measurement, dict):
                continue

            measurements.append(
    Measurement(
        category=category,
        parameter=parameter.upper(),
        value=measurement.get("value"),
        unit=measurement.get("unit"),
        source_document=source_document,
        page_number=page_number,
    )
)

    return MedicalRecord(
    hospital_information=HospitalInformation(
        **raw_data.get("hospital_information", {})
    ),
    patient_demographics=PatientDemographics(
        **raw_data.get("patient_demographics", {})
    ),
    measurements=measurements,
    sources=[
        {
            "file_name": source_document,
            "page_number": page_number,
        }
    ] if source_document and page_number else [],
)
