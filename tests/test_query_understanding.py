from app.graph.query_understanding import understand_query


query = (
    "Show me the patient's previous cardiovascular "
    "history and echocardiography findings."
)

result = understand_query(query)

print("\n----- ORIGINAL QUERY -----")
print(query)

print("\n----- QUERY UNDERSTANDING -----")
print(result.model_dump_json(indent=2))