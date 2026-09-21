import os

from dotenv import load_dotenv
from google import genai

from app.schemas.query import QueryUnderstanding


load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def understand_query(query: str) -> QueryUnderstanding:

    prompt = f"""
You are a medical-record retrieval query analyzer.

Your task is ONLY to understand the doctor's retrieval request.

Do NOT diagnose the patient.
Do NOT provide medical advice.
Do NOT infer medical conditions.

Extract:
1. intent
2. relevant medical topics
3. a concise search query for historical medical records

Doctor query:
{query}

Return only valid JSON matching this structure:

{{
    "intent": "string",
    "topics": ["string"],
    "search_query": "string"
}}
"""

    interaction = client.interactions.create(
        model="gemini-3.5-flash-lite",
        input=prompt,
    )

    result = interaction.output_text.strip()

    # Handle accidental markdown code fences
    if result.startswith("```"):
        result = result.replace("```json", "")
        result = result.replace("```", "")
        result = result.strip()

    import json

    data = json.loads(result)

    return QueryUnderstanding(**data)