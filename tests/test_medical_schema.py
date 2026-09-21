import json

from app.ingestion.medical_record_normalizer import normalize_medical_record


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

print("Medical record normalization successful")
print(medical_record.model_dump_json(indent=2))