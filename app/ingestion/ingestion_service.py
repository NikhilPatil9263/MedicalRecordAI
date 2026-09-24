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
    """
    Process an uploaded medical document.

    Pipeline:

        Document
            ↓
        Document extraction
            ↓
        ┌───────────────────────┐
        │                       │
        │ TEXT_EXTRACTION       │
        │                       │
        │ VLM_REQUIRED          │
        │                       │
        └───────────────────────┘
            ↓
        Validation
            ↓
        Structured persistence / Vector DB
            ↓
        Return processing result

    The caller is responsible for updating the Document
    processing_status after this function succeeds.
    """

    # ========================================================
    # Initial document extraction
    # ========================================================

    text, method = extract_document_text(
        file_path
    )

    file_name = os.path.basename(
        file_path
    )

    # ========================================================
    # TEXT EXTRACTION
    # ========================================================

    if method == "TEXT_EXTRACTION":

        # ----------------------------------------------------
        # Validate patient identity from extracted text
        # ----------------------------------------------------

        document_patient_names = extract_patient_names(
            text
        )

        if len(document_patient_names) == 0:
            raise ValueError(
                "Could not identify the patient "
                "in the medical document."
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

        # ----------------------------------------------------
        # Verify uploaded document belongs to patient
        # ----------------------------------------------------

        if (
            patient_name
            and document_patient_name.strip().lower()
            != patient_name.strip().lower()
        ):
            raise ValueError(
                "Document patient does not match "
                "the authenticated patient."
            )

        # ----------------------------------------------------
        # Store searchable text in vector database
        # ----------------------------------------------------

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

    # ========================================================
    # VLM EXTRACTION
    # ========================================================

    if method == "VLM_REQUIRED":

        # ----------------------------------------------------
        # Extract structured medical information
        # ----------------------------------------------------

        raw_vlm_data = extract_with_vlm(
            file_path
        )

        # ----------------------------------------------------
        # Normalize VLM output into application schema
        # ----------------------------------------------------

        medical_record = normalize_vlm_output(
            data=raw_vlm_data,
            file_name=file_name,
        )

        # ----------------------------------------------------
        # Validate patient identity
        # ----------------------------------------------------

        document_patient_name = (
            medical_record
            .patient_demographics
            .name
            or ""
        ).strip().lower()

        authenticated_patient_name = (
            patient_name or ""
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

        # ----------------------------------------------------
        # Convert structured record into searchable text
        # ----------------------------------------------------

        searchable_text = medical_record_to_text(
            medical_record
        )

        # ----------------------------------------------------
        # Persist structured medical record
        # ----------------------------------------------------

        save_medical_record(
            medical_record=medical_record,
            document_id=document_id,
            patient_id=patient_id,
        )

        # ----------------------------------------------------
        # Store searchable representation in vector DB
        # ----------------------------------------------------

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

    # ========================================================
    # Unsupported extraction method
    # ========================================================

    raise ValueError(
        f"Unsupported document processing method: {method}"
    )