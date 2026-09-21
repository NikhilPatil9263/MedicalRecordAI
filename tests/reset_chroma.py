import chromadb

CHROMA_PATH = "data/chroma"

client = chromadb.PersistentClient(
    path=CHROMA_PATH
)

try:
    client.delete_collection(
        name="medical_records"
    )
    print("Deleted old medical_records collection.")

except Exception:
    print("Collection did not exist.")

client.get_or_create_collection(
    name="medical_records"
)

print("Created fresh medical_records collection.")