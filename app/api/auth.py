from fastapi import APIRouter, HTTPException

from app.db.database import SessionLocal
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse
from app.auth.security import verify_password, create_access_token


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):

    db = SessionLocal()

    try:
        user = db.query(User).filter(
            User.email == request.email
        ).first()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not verify_password(
            request.password,
            user.password_hash
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        access_token = create_access_token(
            user_id=user.id,
            role=user.role
        )

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    finally:
        db.close()