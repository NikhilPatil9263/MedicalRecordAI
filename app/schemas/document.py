from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    document_id: int
    file_name: str
    processing_status: str


class DocumentResponse(BaseModel):
    document_id: int
    file_name: str
    file_type: str
    extraction_method: str | None = None
    processing_status: str
    uploaded_at: str | None = None