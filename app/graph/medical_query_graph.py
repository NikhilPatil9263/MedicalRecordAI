from langgraph.graph import StateGraph, START, END

from app.graph.state import MedicalQueryState
from app.graph.context_builder import build_medical_context

from app.graph.nodes import (
    query_understanding_node,
    vector_retrieval_node,
    sql_retrieval_node,
    generation_node,
)


graph_builder = StateGraph(MedicalQueryState)


graph_builder.add_node(
    "query_understanding",
    query_understanding_node,
)

graph_builder.add_node(
    "vector_retrieval",
    vector_retrieval_node,
)

graph_builder.add_node(
    "sql_retrieval",
    sql_retrieval_node,
)

graph_builder.add_node(
    "context_builder",
    build_medical_context,
)

graph_builder.add_node(
    "generation",
    generation_node,
)


graph_builder.add_edge(
    START,
    "query_understanding",
)

graph_builder.add_edge(
    "query_understanding",
    "vector_retrieval",
)

graph_builder.add_edge(
    "vector_retrieval",
    "sql_retrieval",
)

graph_builder.add_edge(
    "sql_retrieval",
    "context_builder",
)

graph_builder.add_edge(
    "context_builder",
    "generation",
)

graph_builder.add_edge(
    "generation",
    END,
)


medical_query_graph = graph_builder.compile()