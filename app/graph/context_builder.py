from app.graph.state import MedicalQueryState


def build_medical_context(
    state: MedicalQueryState
) -> MedicalQueryState:

    sql_records = state.get("sql_records", [])
    vector_records = state.get("retrieved_records", [])

    context_parts = []

    # Patient information from PostgreSQL
    if sql_records:
        context_parts.append("PATIENT INFORMATION")

        for record in sql_records:
            context_parts.append(
                f"Patient ID: {record.get('patient_id')}\n"
                f"Name: {record.get('name')}\n"
                f"Gender: {record.get('gender')}\n"
                f"Date of Birth: {record.get('date_of_birth')}"
            )

    # Historical medical records from ChromaDB
    if vector_records:
        context_parts.append("\nHISTORICAL MEDICAL RECORDS")

        for index, record in enumerate(vector_records, start=1):
            metadata = record.get("metadata", {})

            context_parts.append(
                f"\nRecord {index}\n"
                f"Source: {metadata.get('file_name')}\n"
                f"Page: {metadata.get('page_number')}\n"
                f"Content:\n{record.get('content')}"
            )

    medical_context = "\n".join(context_parts)

    return {
        **state,
        "medical_context": medical_context,
    }