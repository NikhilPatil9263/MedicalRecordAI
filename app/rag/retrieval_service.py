from app.rag.vector_store import search_medical_documents


def retrieve_relevant_medical_records(
    query: str,
    patient_id: int,
    top_k: int = 5,
) -> list[dict]:

    results = search_medical_documents(
        query=query,
        patient_id=patient_id,
        top_k=top_k,
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    records = []

    for index, document in enumerate(documents):

        metadata = (
            metadatas[index]
            if index < len(metadatas)
            else {}
        )

        record = {
            "content": document,
            "metadata": metadata,
        }

        if index < len(distances):
            record["distance"] = distances[index]

        records.append(record)

    return records