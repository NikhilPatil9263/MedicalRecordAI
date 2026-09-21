from app.graph.state import MedicalQueryState
from app.graph.generation import generate_medical_summary
from app.graph.query_understanding import understand_query
from app.rag.retrieval_service import (
    retrieve_relevant_medical_records
)
from app.rag.sql_retrieval import retrieve_patient_sql_data

def sql_retrieval_node(
    state: MedicalQueryState
) -> MedicalQueryState:

    records = retrieve_patient_sql_data(
        patient_id=state["patient_id"]
    )

    return {
        **state,
        "sql_records": records,
    }


def query_understanding_node(
    state: MedicalQueryState
) -> MedicalQueryState:

    result = understand_query(state["query"])

    return {
        **state,
        "intent": result.intent,
        "topics": result.topics,
        "search_query": result.search_query,
    }


def vector_retrieval_node(
    state: MedicalQueryState
) -> MedicalQueryState:

    records = retrieve_relevant_medical_records(
        query=state["search_query"],
        patient_id=state["patient_id"],
        top_k=5,
    )

    return {
        **state,
        "retrieved_records": records,
    }

def generation_node(
    state: MedicalQueryState
) -> MedicalQueryState:

    response = generate_medical_summary(
        query=state["query"],
        medical_context=state["medical_context"],
        patient_id=state["patient_id"],
    )

    return {
        **state,
        "generated_response": response.model_dump(),
    }

    response = generate_medical_summary(
        query=state["query"],
        medical_context=state["medical_context"],
    )

    return {
        **state,
        "generated_response": response,
    }