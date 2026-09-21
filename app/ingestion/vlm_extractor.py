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

    This function performs data extraction only.
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

Extract only clinically relevant fields that are visibly present
in the supplied document.

This is NOT a summarization or transcription task.

Rules:
- Return structured JSON only.
- Do not reproduce paragraphs or long passages from the document.
- Do not quote the document.
- Do not copy large sections of text.
- Do not diagnose the patient.
- Do not provide medical advice.
- Do not infer information that is not visible.
- Preserve numerical measurements and their units.
- If a field is missing or unreadable, use null.
- Extract concise field values only.
- Do not add information that is not present in the document.

Return JSON using this structure:

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

    "medical_measurements": {}
}

For medical measurements:
- Preserve the parameter name.
- Preserve the value exactly as visible.
- Preserve units when visible.
- Group related measurements logically.
- Do not calculate or derive new values.
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