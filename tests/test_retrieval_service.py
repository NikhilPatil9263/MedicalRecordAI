from app.rag.retrieval_service import (
    retrieve_relevant_medical_records
)


query = "Show previous echocardiography measurements"

# Test-only patient ID.
# In the real API, this will come from the
# verified appointment context.
patient_id = 1

records = retrieve_relevant_medical_records(
    query=query,
    patient_id=patient_id,
    top_k=3,
)

print("\n----- DOCTOR QUERY -----")
print(query)

print("\n----- RETRIEVED RECORDS -----")

for index, record in enumerate(records, start=1):

    print(f"\n===== RECORD {index} =====")

    print("\nContent:")
    print(record["content"])

    print("\nMetadata:")
    print(record["metadata"])

    if "distance" in record:
        print("\nDistance:")
        print(record["distance"])