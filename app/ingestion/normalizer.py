from app.schemas.medical_record import (
    MedicalRecord,
    HospitalInformation,
    PatientDemographics,
    Measurement,
    SourceDocument,
)


def normalize_vlm_output(
    data: dict,
    file_name: str,
) -> MedicalRecord:
    """
    Convert Gemini VLM output into the canonical
    MedicalRecord schema.
    """

    # ---------------------------------------------------------
    # Hospital information
    # ---------------------------------------------------------

    hospital_data = data.get(
        "hospital_information",
        {}
    )

    hospital_information = HospitalInformation(
        name=hospital_data.get("name"),
        address=hospital_data.get("address"),
    )

    # ---------------------------------------------------------
    # Patient demographics
    # ---------------------------------------------------------

    patient_data = data.get(
        "patient_demographics",
        {}
    )

    patient_demographics = PatientDemographics(
        name=patient_data.get("name"),
        age=patient_data.get("age"),
        gender=patient_data.get("gender"),
        patient_id=patient_data.get("patient_id"),

        study_date=data.get(
            "study_report_date"
        ),

        dob=patient_data.get("dob"),
        ht=patient_data.get("height"),
        wt=patient_data.get("weight"),
        bsa=patient_data.get("bsa"),

        referring_physician=patient_data.get(
            "referring_physician"
        ),

        performed_by=patient_data.get(
            "performed_by"
        ),
    )

    # ---------------------------------------------------------
    # Medical measurements
    # ---------------------------------------------------------

    measurements = []

    medical_measurements = data.get(
        "medical_measurements",
        {}
    )

    for category, values in medical_measurements.items():

        # Each category should contain
        # parameter -> value pairs.
        if not isinstance(values, dict):
            continue

        for parameter, value in values.items():

            if value is None:
                continue

            measurements.append(
                Measurement(
                    category=category,
                    parameter=parameter,
                    value=str(value),
                    unit=None,
                    source_document=file_name,
                    page_number=1,
                )
            )

    # ---------------------------------------------------------
    # Source document
    # ---------------------------------------------------------

    sources = [
        SourceDocument(
            file_name=file_name,
            page_number=1,
        )
    ]

    # ---------------------------------------------------------
    # Final canonical record
    # ---------------------------------------------------------

    return MedicalRecord(
        hospital_information=hospital_information,
        patient_demographics=patient_demographics,
        measurements=measurements,
        sources=sources,
    )