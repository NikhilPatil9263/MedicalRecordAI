from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.doctor_query import router as doctor_query_router
from app.api.patient_documents import router as patient_documents_router
from app.api.admin import router as admin_router


app = FastAPI(
    title="Medical Record AI"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(doctor_query_router)
app.include_router(auth_router)
app.include_router(patient_documents_router)
app.include_router(admin_router)