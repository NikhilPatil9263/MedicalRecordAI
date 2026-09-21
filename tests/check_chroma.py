from app.rag.vector_store import collection

results = collection.get(
    where={"document_id": 18}
)

print("\n===== CHROMA DOCUMENT 18 =====")

print("\nIDs:")
print(results.get("ids"))

print("\nDocuments:")
print(results.get("documents"))

print("\nMetadata:")
print(results.get("metadatas"))