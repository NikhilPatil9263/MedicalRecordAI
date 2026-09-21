from typing import TypedDict


class MedicalQueryState(TypedDict, total=False):
    query: str
    patient_id: int

    intent: str
    topics: list[str]
    search_query: str

    retrieved_records: list[dict]

from typing import TypedDict


class MedicalQueryState(TypedDict, total=False):
    query: str
    patient_id: int

    intent: str
    topics: list[str]
    search_query: str

    retrieved_records: list[dict]
    sql_records: list[dict]

    from typing import TypedDict


class MedicalQueryState(TypedDict, total=False):
    query: str
    patient_id: int

    intent: str
    topics: list[str]
    search_query: str

    retrieved_records: list[dict]
    sql_records: list[dict]

    medical_context: str
    generated_response: str

    
