from sqlalchemy import text

from app.db.database import SessionLocal


def retrieve_patient_sql_data(patient_id: int) -> list[dict]:
    db = SessionLocal()

    try:
        query = text("""
            SELECT
                p.id AS patient_id,
                p.date_of_birth,
                p.gender,
                u.name,
                u.email
            FROM patients p
            JOIN users u
                ON p.user_id = u.id
            WHERE p.id = :patient_id
        """)

        result = db.execute(
            query,
            {"patient_id": patient_id}
        )

        rows = result.mappings().all()

        return [dict(row) for row in rows]

    finally:
        db.close()