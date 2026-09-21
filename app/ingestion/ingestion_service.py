import os

from app.ingestion.document_extractor import (
    extract_document_text,
    extract_patient_names,
)

from app.ingestion.vlm_extractor import extract_with_vlm
from app.ingestion.normalizer import normalize_vlm_output

from app.rag.medical_record_to_text import medical_record_to_text
from app.rag.vector_store import add_medical_record

from app.db.medical_record_service import save_medical_record


def process_document(
    file_path: str,
    patient_id: int,
    patient_name: str,
    document_id: int,
) -> dict:

    # ==========================================
    # Extract Document
    # ==========================================

    text, method = extract_document_text(
        file_path
    )

    file_name = os.path.basename(
        file_path
    )

    # ==========================================
    # Native Text PDF
    # ==========================================

    if method == "TEXT_EXTRACTION":

        # Extract all patient names from PDF
        document_patient_names = extract_patient_names(
            text
        )

        # ==========================================
        # Patient Identity Validation
        # ==========================================

        if len(document_patient_names) == 0:
            raise ValueError(
                "Could not identify the patient in "
                "the medical document."
            )

        if len(document_patient_names) > 1:
            raise ValueError(
                "Document contains multiple patients. "
                "Please upload a document belonging "
                "to one patient only."
            )

        document_patient_name = (
            document_patient_names[0]
        )

        if (
            patient_name
            and document_patient_name.strip().lower()
            != patient_name.strip().lower()
        ):
            raise ValueError(
                "Document patient does not match "
                "the authenticated patient."
            )

        # ==========================================
        # Store in ChromaDB
        # ==========================================

        add_medical_record(
            medical_record_text=text,
            patient_id=patient_id,
            patient_name=patient_name,
            document_id=document_id,
            file_name=file_name,
            page_number=1,
        )

        return {
            "extraction_method": "TEXT_EXTRACTION",
            "extracted_text": text,
            "structured_data": None,
        }

    # ==========================================
    # Scanned PDF / Image → Gemini VLM
    # ==========================================

    if method == "VLM_REQUIRED":

        raw_vlm_data = extract_with_vlm(
            file_path
        )

        medical_record = normalize_vlm_output(
            data=raw_vlm_data,
            file_name=file_name,
        )

        # ==========================================
        # Patient Identity Validation
        # ==========================================

        document_patient_name = (
            medical_record
            .patient_demographics
            .name
            or ""
        ).strip().lower()

        authenticated_patient_name = (
            patient_name
            or ""
        ).strip().lower()

        if (
            document_patient_name
            and authenticated_patient_name
            and document_patient_name
            != authenticated_patient_name
        ):
            raise ValueError(
                "Document patient does not match "
                "the authenticated patient."
            )

        # ==========================================
        # Convert Structured Record to Searchable Text
        # ==========================================

        searchable_text = medical_record_to_text(
            medical_record
        )

        # ==========================================
        # Save Structured Data to PostgreSQL
        # ==========================================

        save_medical_record(
            medical_record=medical_record,
            document_id=document_id,
            patient_id=patient_id,
        )

        # ==========================================
        # Store Searchable Data in ChromaDB
        # ==========================================

        add_medical_record(
            medical_record_text=searchable_text,
            patient_id=patient_id,
            patient_name=patient_name,
            document_id=document_id,
            file_name=file_name,
            page_number=1,
        )

        return {
            "extraction_method": "VLM",
            "extracted_text": searchable_text,
            "structured_data": medical_record,
        }

    # ==========================================
    # Unsupported Document
    # ==========================================

    raise ValueError(
        "Unsupported document type"
    )