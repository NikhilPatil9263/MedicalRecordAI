import os
import re

from app.ingestion.pdf_extractor import extract_text_from_pdf


def is_valid_extraction(text: str) -> bool:
    if not text:
        return False

    text = text.strip()

    # Too little text means extraction is probably unusable
    if len(text) < 50:
        return False

    # Check whether the extracted content contains
    # a reasonable amount of readable text
    alphabetic_chars = sum(
        char.isalpha()
        for char in text
    )

    if alphabetic_chars < 20:
        return False

    return True


def extract_patient_names(text: str) -> list[str]:
    """
    Extract all patient names found in a medical document.

    A document is expected to contain records for exactly
    one patient.
    """

    pattern = r"Patient\s+Name\s*[:\-]?\s*([A-Za-z][A-Za-z .'-]+)"

    matches = re.findall(
        pattern,
        text,
        re.IGNORECASE
    )

    patient_names = []

    for name in matches:
        name = name.strip()

        if name and name not in patient_names:
            patient_names.append(name)

    return patient_names


def detect_document_type(file_path: str) -> str:
    extension = os.path.splitext(file_path)[1].lower()

    if extension == ".pdf":
        return "PDF"

    if extension in [".png", ".jpg", ".jpeg"]:
        return "IMAGE"

    return "UNKNOWN"


def extract_document_text(
    file_path: str
) -> tuple[str, str]:

    document_type = detect_document_type(
        file_path
    )

    # Images go directly to VLM
    if document_type == "IMAGE":
        return "", "VLM_REQUIRED"

    # PDF → PyMuPDF first
    if document_type == "PDF":

        text = extract_text_from_pdf(
            file_path
        )

        if is_valid_extraction(text):
            return text, "TEXT_EXTRACTION"

        # PyMuPDF failed / insufficient text
        return "", "VLM_REQUIRED"

    return "", "UNSUPPORTED"