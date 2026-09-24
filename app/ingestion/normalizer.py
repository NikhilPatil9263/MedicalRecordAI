from app.schemas.medical_record import (
    MedicalRecord,
    HospitalInformation,
    PatientDemographics,
    MedicalHistory,
    Diagnosis,
    Medication,
    Allergy,
    Investigation,
    Measurement,
    SourceDocument,
)


def normalize_vlm_output(
    data: dict,
    file_name: str
) -> MedicalRecord:

    # -----------------------------
    # Hospital information
    # -----------------------------
    hospital_data = data.get(
        "hospital_information",
        {}
    )

    hospital_information = HospitalInformation(
        name=hospital_data.get("name"),
        address=hospital_data.get("address"),
    )

    # -----------------------------
    # Patient demographics
    # -----------------------------
    patient_data = data.get(
        "patient_demographics",
        {}
    )

    patient_demographics = PatientDemographics(
        name=patient_data.get("name"),
        age=patient_data.get("age"),
        gender=patient_data.get("gender"),
        patient_id=patient_data.get("patient_id"),
        study_date=data.get("study_report_date"),
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

    # -----------------------------
    # Medical history
    # -----------------------------
    medical_history = []

    for item in data.get(
        "medical_history",
        []
    ):

        if not isinstance(item, dict):
            continue

        condition = item.get("condition")

        if not condition:
            continue

        medical_history.append(
            MedicalHistory(
                condition=str(condition),
                details=item.get("details"),
            )
        )

    # -----------------------------
    # Diagnoses
    # -----------------------------
    diagnoses = []

    for item in data.get(
        "diagnoses",
        []
    ):

        if not isinstance(item, dict):
            continue

        condition = item.get("condition")

        if not condition:
            continue

        diagnoses.append(
            Diagnosis(
                condition=str(condition),
                details=item.get("details"),
            )
        )

    # -----------------------------
    # Medications
    # -----------------------------
    medications = []

    for item in data.get(
        "medications",
        []
    ):

        if not isinstance(item, dict):
            continue

        name = item.get("name")

        if not name:
            continue

        medications.append(
            Medication(
                name=str(name),
                dose=item.get("dose"),
                frequency=item.get("frequency"),
                details=item.get("details"),
            )
        )

    # -----------------------------
    # Allergies
    # -----------------------------
    allergies = []

    for item in data.get(
        "allergies",
        []
    ):

        if not isinstance(item, dict):
            continue

        allergen = item.get("allergen")

        if not allergen:
            continue

        allergies.append(
            Allergy(
                allergen=str(allergen),
                reaction=item.get("reaction"),
            )
        )

    # -----------------------------
    # Investigations
    # -----------------------------
    investigations = []

    for item in data.get(
        "investigations",
        []
    ):

        if not isinstance(item, dict):
            continue

        name = item.get("name")

        if not name:
            continue

        investigations.append(
            Investigation(
                name=str(name),
                date=item.get("date"),
                findings=item.get("findings"),
            )
        )

    # -----------------------------
    # Medical measurements
    # -----------------------------
    measurements = []

    medical_measurements = data.get(
        "medical_measurements",
        {}
    )

    if isinstance(medical_measurements, dict):

        for category, values in medical_measurements.items():

            if not isinstance(values, dict):
                continue

            for parameter, value in values.items():

                if value is None:
                    continue

                measurements.append(
                    Measurement(
                        category=str(category),
                        parameter=str(parameter),
                        value=str(value),
                        unit=None,
                        source_document=file_name,
                        page_number=1,
                    )
                )

    # -----------------------------
    # Source document
    # -----------------------------
    sources = [
        SourceDocument(
            file_name=file_name,
            page_number=1,
        )
    ]

    # -----------------------------
    # Final normalized record
    # -----------------------------
    return MedicalRecord(
        hospital_information=hospital_information,
        patient_demographics=patient_demographics,
        medical_history=medical_history,
        diagnoses=diagnoses,
        medications=medications,
        allergies=allergies,
        investigations=investigations,
        measurements=measurements,
        sources=sources,
    )