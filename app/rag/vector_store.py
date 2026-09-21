import chromadb


CHROMA_PATH = "data/chroma"


client = chromadb.PersistentClient(
    path=CHROMA_PATH
)


collection = client.get_or_create_collection(
    name="medical_records"
)


def add_medical_record(
    medical_record_text: str,
    patient_id: int,
    patient_name: str,
    document_id: int,
    file_name: str,
    page_number: int = 1
):
    """
    Store a normalized medical record as a searchable
    ChromaDB document.
    """

    chunk_id = (
        f"patient_{patient_id}"
        f"_document_{document_id}"
        f"_page_{page_number}"
    )

    metadata = {
        "patient_id": patient_id,
        "document_id": document_id,
        "patient_name": patient_name,
        "file_name": file_name,
        "page_number": page_number,
    }

    collection.upsert(
        ids=[chunk_id],
        documents=[medical_record_text],
        metadatas=[metadata],
    )


def search_medical_documents(
    query: str,
    patient_id: int,
    top_k: int = 5,
):
    """
    Search medical records while enforcing patient-level
    filtering.
    """

    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where={
            "patient_id": patient_id
        },
    )

    return results