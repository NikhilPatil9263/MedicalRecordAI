from app.db.database import SessionLocal
from app.models.audit_log import AuditLog


def create_audit_log(
    user_id: int,
    action: str,
    resource_type: str,
    resource_id: int | None = None,
):
    db = SessionLocal()

    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
        )

        db.add(audit_log)
        db.commit()

    finally:
        db.close()