import json
import os

from dotenv import load_dotenv
from google import genai

from app.schemas.response import MedicalResponse

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def generate_medical_summary(
    query: str,
    medical_context: str,
    patient_id: int
) -> MedicalResponse:

    prompt = f"""
You are an AI assistant helping a doctor review a patient's historical
medical records.

Doctor's query:
{query}

Patient ID:
{patient_id}

Retrieved medical context:
{medical_context}

Your task:
Summarize ONLY the relevant historical information present in the
retrieved context.

Rules:
- Do NOT diagnose the patient.
- Do NOT provide treatment recommendations.
- Do NOT invent or infer missing information.
- Do NOT change numerical values.
- Preserve source filename and page number when available.
- Use only information present in the retrieved context.
- Mention limitations when appropriate.

Return ONLY valid JSON in exactly this structure:

{{
    "patient_id": {patient_id},
    "summary": "concise doctor-facing summary",
    "sources": [
        "filename - Page X"
    ],
    "limitations": [
        "limitation if applicable"
    ]
}}
"""

    interaction = client.interactions.create(
        model="gemini-3.5-flash-lite",
        input=prompt,
    )

    result = interaction.output_text.strip()

    if result.startswith("```"):
        result = result.replace("```json", "")
        result = result.replace("```", "")
        result = result.strip()

    data = json.loads(result)

    return MedicalResponse(**data)