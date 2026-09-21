from app.rag.retrieval_service import (
    retrieve_relevant_medical_records,
)


results = retrieve_relevant_medical_records(
    query="previous cardiac measurements",
    patient_id=1,
    top_k=5,
)


print("\n----- RETRIEVAL RESULTS -----")

for index, result in enumerate(results, start=1):

    print(f"\nResult {index}")
    print("Content:")
    print(result["content"])

    print("Metadata:")
    print(result["metadata"])

    if "distance" in result:
        print("Distance:", result["distance"])