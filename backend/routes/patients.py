
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Patient
from schemas import PatientCreate, PatientResponse

router = APIRouter(
    prefix="/api/patients",
    tags=["Patients"]
)


# Register a new patient
@router.post("/", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db)
):
    try:
        new_patient = Patient(
            name=patient.name,
            age=patient.age,
            gender=patient.gender,
            phone=patient.phone
        )

        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)

        return new_patient

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create patient"
        )


# Get all patients
@router.get("/", response_model=list[PatientResponse])
def get_patients(db: Session = Depends(get_db)):
    return db.query(Patient).all()
