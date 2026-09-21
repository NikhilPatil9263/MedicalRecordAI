import json

from app.ingestion.medical_record_normalizer import normalize_medical_record
from app.ingestion.medical_record_text import medical_record_to_text


with open(
    "data/synthetic_records/gemini_output.json",
    "r",
    encoding="utf-8"
) as file:
    raw_data = json.load(file)


medical_record = normalize_medical_record(
    raw_data,
    source_document="test_300dpi.png",
    page_number=1,
)

text = medical_record_to_text(medical_record)

print("Medical record converted to text successfully")
print("\n----- SEARCHABLE MEDICAL TEXT -----")
print(text)