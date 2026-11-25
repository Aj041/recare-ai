"""Prototype doctor login endpoint; see backend/AUTHENTICATION.md."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Doctor
from schemas import DoctorLoginRequest, JWTAccessTokenResponse
from services.doctor_auth import (
    create_access_token,
    ensure_demo_doctor,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/doctor/login",
    response_model=JWTAccessTokenResponse,
    description="Hackathon prototype login for a configured synthetic doctor account.",
)
def doctor_login(credentials: DoctorLoginRequest, db: Session = Depends(get_db)):
    email = credentials.email.strip().casefold()
    doctor = db.query(Doctor).filter(Doctor.email == email).first()
    if doctor is None:
        # Optional first-login bootstrap for existing demo deployments. Once
        # provisioned, authentication depends only on the database hash.
        seeded_doctor = ensure_demo_doctor(db)
        if seeded_doctor is not None and seeded_doctor.email == email:
            doctor = seeded_doctor
    if doctor is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if doctor is None or not verify_password(credentials.password, doctor.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    try:
        token, expires_in = create_access_token(doctor.email, doctor.role)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_in,
    }
