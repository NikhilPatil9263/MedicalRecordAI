import json

from app.ingestion.medical_record_normalizer import normalize_medical_record
from app.ingestion.medical_record_chunker import chunk_medical_record


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

chunks = chunk_medical_record(medical_record)

print("Medical record chunking successful")
print("Total chunks:", len(chunks))

for index, chunk in enumerate(chunks, start=1):
    print(f"\n----- CHUNK {index} -----")
    print(chunk)