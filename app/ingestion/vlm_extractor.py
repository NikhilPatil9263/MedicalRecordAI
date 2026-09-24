import base64
import json
import os

from dotenv import load_dotenv
from google import genai


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def extract_with_vlm(file_path: str) -> dict:
    """
    Extract structured medical information from an image or PDF
    using Gemini Vision.

    This function performs extraction only.
    It does not diagnose, summarize, or provide medical advice.
    """

    # Read file
    with open(file_path, "rb") as file:
        file_base64 = base64.b64encode(
            file.read()
        ).decode("utf-8")

    # Detect file type
    extension = os.path.splitext(
        file_path
    )[1].lower()

    if extension == ".pdf":
        mime_type = "application/pdf"

    elif extension == ".png":
        mime_type = "image/png"

    elif extension in [".jpg", ".jpeg"]:
        mime_type = "image/jpeg"

    else:
        raise ValueError(
            f"Unsupported file type: {extension}"
        )

    # Structured extraction prompt
    prompt = """
You are performing structured data extraction from a medical record.

Extract only clinically relevant information that is explicitly
visible in the supplied document.

This is NOT a summarization, diagnosis, interpretation,
or medical-advice task.

Rules:

- Return structured JSON only.
- Do not reproduce paragraphs or long passages.
- Do not quote the document.
- Do not copy large sections of text.
- Do not diagnose the patient.
- Do not provide medical advice.
- Do not infer information that is not explicitly present.
- Do not convert a measurement into a diagnosis.
- Preserve numerical measurements and their units.
- Preserve clinically meaningful findings when explicitly stated.
- If a field is missing or not documented, return an empty list
  or null as appropriate.
- Extract concise values only.
- Do not add information that is not present in the document.
- Keep information tied to the supplied document.
- Do not use general medical knowledge to fill missing fields.

Return JSON using exactly this structure:

{
    "hospital_information": {
        "name": null,
        "address": null
    },

    "patient_demographics": {
        "name": null,
        "age": null,
        "gender": null,
        "patient_id": null,
        "dob": null,
        "height": null,
        "weight": null,
        "bsa": null,
        "referring_physician": null,
        "performed_by": null
    },

    "study_report_date": null,

    "medical_history": [],

    "diagnoses": [],

    "medications": [],

    "allergies": [],

    "investigations": [],

    "medical_measurements": {}
}

### Medical history

Extract explicitly documented previous medical history,
symptoms/history, past conditions, or relevant historical events.

Example:

"medical_history": [
    {
        "condition": "Chest discomfort",
        "details": "Intermittent"
    }
]

Do NOT classify a symptom or history as a diagnosis unless
the document explicitly identifies it as a diagnosis.

### Diagnoses

Extract only diagnoses or conditions explicitly documented
as diagnoses in the supplied document.

Example:

"diagnoses": [
    {
        "condition": "Hypertension",
        "details": "Previously diagnosed"
    }
]

Do not infer diagnoses from blood pressure, ECG,
echocardiogram, laboratory values, or other measurements.

### Medications

Extract medications explicitly mentioned in the document.

Preserve the medication name, dose, frequency, and other
details only when they are explicitly available.

Example:

"medications": [
    {
        "name": "Amlodipine",
        "dose": "5 mg",
        "frequency": "Once daily",
        "details": null
    }
]

Do not infer medications from diagnoses or treatment guidelines.

### Allergies

Extract explicitly documented allergies.

Example:

"allergies": [
    {
        "allergen": "Penicillin",
        "reaction": "Rash"
    }
]

If the document explicitly states that there are no known
allergies, preserve that information.

Do not assume an allergy is absent simply because no allergy
is mentioned.

### Investigations

Extract investigations, tests, imaging studies, laboratory
tests, ECGs, echocardiograms, etc. that are explicitly present.

For each investigation, preserve its name, date if available,
and concise documented findings.

Example:

"investigations": [
    {
        "name": "ECG",
        "date": null,
        "findings": "Sinus rhythm without acute ST-segment elevation"
    },
    {
        "name": "Echocardiogram",
        "date": null,
        "findings": "Preserved left ventricular systolic function"
    }
]

Do not interpret the findings or determine whether they are
normal or abnormal unless the document explicitly states this.

### Medical measurements

Extract numerical or quantitative measurements.

For medical measurements:

- Preserve the original parameter name.
- Preserve the value exactly as visible.
- Preserve units when visible.
- Group related measurements logically.
- Do not calculate or derive new values.
- Do not interpret measurements.
- Do not convert measurements into diagnoses.

Example:

"medical_measurements": {
    "2d": {
        "LV Vol": "32.4 ml",
        "EF (A4C)": "68.8 %"
    },
    "MMode": {
        "LVIDd (MM)": "3.57 cm"
    }
}

If no medical measurements are present, return:

"medical_measurements": {}

Return valid JSON only.
"""

    # Send document to Gemini
    interaction = client.interactions.create(
        model="gemini-3.5-flash-lite",
        input=[
            {
                "type": "text",
                "text": prompt
            },
            {
                "type": "image",
                "data": file_base64,
                "mime_type": mime_type
            }
        ]
    )

    # Extract model output
    result = interaction.output_text.strip()

    # Remove Markdown JSON fences if returned
    if result.startswith("```"):
        result = result.replace(
            "```json",
            ""
        )
        result = result.replace(
            "```",
            ""
        )
        result = result.strip()

    # Convert JSON string to Python dictionary
    try:
        return json.loads(result)

    except json.JSONDecodeError as error:
        raise ValueError(
            f"Gemini returned invalid JSON: {error}\n"
            f"Response:\n{result}"
        )