import io

import pymupdf
import pytesseract
from PIL import Image


TESSERACT_PATH = r"D:\MedicalRecordAI\tools\tesseract\tesseract.exe"

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


def extract_text_from_image(image_path: str) -> str:
    image = Image.open(image_path)

    text = pytesseract.image_to_string(image)

    return text


def extract_text_from_scanned_pdf(file_path: str) -> str:
    document = pymupdf.open(file_path)

    pages = []

    for page in document:
        pixmap = page.get_pixmap(
            matrix=pymupdf.Matrix(2, 2)
        )

        image_bytes = pixmap.tobytes("png")

        image = Image.open(
            io.BytesIO(image_bytes)
        )

        text = pytesseract.image_to_string(image)

        pages.append(text)

    document.close()

    return "\n".join(pages)