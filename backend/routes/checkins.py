
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Patient, CheckIn

router = APIRouter(
    prefix="/api/patients",
    tags=["Patient History"]
)


@router.get("/{patient_id}/history")
def get_patient_history(
    patient_id: int,
    db: Session = Depends(get_db)
):
    # Check whether patient exists
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # Retrieve patient's check-in history
    history = db.query(CheckIn).filter(
        CheckIn.patient_id == patient_id
    ).order_by(CheckIn.created_at.asc()).all()

    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "total_checkins": len(history),
        "history": [
            {
                "id": item.id,
                "pain_level": item.pain_level,
                "temperature": item.temperature,
                "symptoms": item.symptoms,
                "mood": item.mood,
                "notes": item.notes,
                "created_at": item.created_at
            }
            for item in history
        ]
    }

import json
from datetime import datetime

from schemas import CheckInCreate


@router.post("/checkins")
def create_checkin(
    checkin: CheckInCreate,
    db: Session = Depends(get_db)
):
    # Verify that the patient exists
    patient = db.query(Patient).filter(
        Patient.id == checkin.patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # Convert symptoms list into JSON text
    symptoms_text = json.dumps(checkin.symptoms or [])

    # Create check-in record
    new_checkin = CheckIn(
        patient_id=checkin.patient_id,
        pain_level=checkin.pain_level,
        temperature=checkin.temperature,
        symptoms=symptoms_text,
        mood=checkin.mood,
        notes=checkin.notes,
        created_at=datetime.utcnow()
    )

    try:
        db.add(new_checkin)
        db.commit()
        db.refresh(new_checkin)

        return {
            "message": "Patient check-in saved successfully",
            "checkin_id": new_checkin.id,
            "patient_id": new_checkin.patient_id,
            "pain_level": new_checkin.pain_level,
            "symptoms": checkin.symptoms or [],
            "created_at": new_checkin.created_at
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save check-in"
        )
