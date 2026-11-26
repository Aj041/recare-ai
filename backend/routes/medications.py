"""Patient medication viewing and doctor-authorized detail updates."""

import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import CarePlan, MedicationHistory, Patient
from schemas import MedicationCurrentResponse, MedicationListResponse, MedicationUpdateRequest
from services.doctor_auth import get_current_doctor

router = APIRouter(prefix="/api/patients", tags=["Medications"])

_MEDICATION_ID_PATTERN = re.compile(r"^medication_(\d+)$")
_NOT_SPECIFIED = "Not specified"


def _get_care_plan(db: Session, patient_id: int, care_plan_id: int | None = None) -> CarePlan:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    query = db.query(CarePlan).filter(CarePlan.patient_id == patient_id)
    if care_plan_id is not None:
        care_plan = query.filter(CarePlan.id == care_plan_id).first()
    else:
        care_plan = query.order_by(CarePlan.created_at.desc(), CarePlan.id.desc()).first()
    if care_plan is None:
        raise HTTPException(status_code=404, detail="No care plan found for this patient")
    return care_plan


def _load_plan_data(care_plan: CarePlan) -> dict:
    try:
        plan_data = json.loads(care_plan.plan_data)
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Stored care plan contains invalid structured data") from exc
    if not isinstance(plan_data, dict):
        raise HTTPException(status_code=500, detail="Stored care plan contains invalid structured data")
    return plan_data


def _display_text(value: object) -> str:
    return value.strip() if isinstance(value, str) and value.strip() else _NOT_SPECIFIED


def _medication_details(item: dict, index: int) -> dict:
    if not isinstance(item, dict):
        raise HTTPException(status_code=500, detail="Stored medication details are invalid")
    return {
        "medication_id": f"medication_{index}",
        "name": _display_text(item.get("name")),
        "dosage": _display_text(item.get("dose")),
        "frequency": _display_text(item.get("frequency")),
        "duration": _display_text(item.get("duration")),
        "instructions": _display_text(item.get("instructions")),
    }


def _medications_from_plan(plan_data: dict) -> list[dict]:
    medications = plan_data.get("medications", [])
    if not isinstance(medications, list):
        raise HTTPException(status_code=500, detail="Stored medication details are invalid")
    return [_medication_details(item, index) for index, item in enumerate(medications)]


def _history_response(item: MedicationHistory) -> dict:
    try:
        previous = json.loads(item.previous_details)
        updated = json.loads(item.updated_details)
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Stored medication history is invalid") from exc
    if not isinstance(previous, dict) or not isinstance(updated, dict):
        raise HTTPException(status_code=500, detail="Stored medication history is invalid")
    return {
        "id": item.id,
        "care_plan_id": item.care_plan_id,
        "medication_id": item.medication_id,
        "medication_name": item.medication_name,
        "previous_details": previous,
        "updated_details": updated,
        "reason": item.reason,
        "doctor_email": item.doctor_email,
        "created_at": item.created_at,
    }


def _medication_list_response(db: Session, care_plan: CarePlan, plan_data: dict) -> dict:
    history = db.query(MedicationHistory).filter(
        MedicationHistory.patient_id == care_plan.patient_id,
        MedicationHistory.care_plan_id == care_plan.id,
    ).order_by(MedicationHistory.created_at.desc(), MedicationHistory.id.desc()).all()
    return {
        "care_plan_id": care_plan.id,
        "patient_id": care_plan.patient_id,
        "medications": _medications_from_plan(plan_data),
        "history": [_history_response(item) for item in history],
    }


@router.get("/{patient_id}/medications", response_model=MedicationCurrentResponse)
def get_latest_medications(patient_id: int, db: Session = Depends(get_db)):
    """Read-only medication details for the latest plan; accessible to the patient view."""
    care_plan = _get_care_plan(db, patient_id)
    return {
        "care_plan_id": care_plan.id,
        "patient_id": care_plan.patient_id,
        "medications": _medications_from_plan(_load_plan_data(care_plan)),
    }


@router.get("/{patient_id}/careplan/{care_plan_id}/medications", response_model=MedicationListResponse)
def get_care_plan_medications(
    patient_id: int,
    care_plan_id: int,
    db: Session = Depends(get_db),
    doctor=Depends(get_current_doctor),
):
    care_plan = _get_care_plan(db, patient_id, care_plan_id)
    return _medication_list_response(db, care_plan, _load_plan_data(care_plan))


@router.patch(
    "/{patient_id}/careplan/{care_plan_id}/medications/{medication_id}",
    response_model=MedicationListResponse,
)
def update_medication(
    patient_id: int,
    care_plan_id: int,
    medication_id: str,
    update: MedicationUpdateRequest,
    db: Session = Depends(get_db),
    doctor=Depends(get_current_doctor),
):
    """Save a doctor-confirmed detail update and append a full audit record."""
    care_plan = _get_care_plan(db, patient_id, care_plan_id)
    match = _MEDICATION_ID_PATTERN.fullmatch(medication_id)
    if match is None:
        raise HTTPException(status_code=404, detail="Medication not found")
    medication_index = int(match.group(1))
    plan_data = _load_plan_data(care_plan)
    medications = plan_data.get("medications", [])
    if not isinstance(medications, list) or medication_index >= len(medications):
        raise HTTPException(status_code=404, detail="Medication not found")
    medication = medications[medication_index]
    if not isinstance(medication, dict):
        raise HTTPException(status_code=500, detail="Stored medication details are invalid")

    previous = _medication_details(medication, medication_index)
    if previous["name"] == _NOT_SPECIFIED:
        raise HTTPException(status_code=500, detail="Stored medication name is invalid")
    updated = {
        "medication_id": medication_id,
        "name": previous["name"],
        "dosage": update.dosage.strip(),
        "frequency": update.frequency.strip(),
        "duration": update.duration.strip(),
        "instructions": update.instructions.strip(),
    }
    if any(not updated[field] for field in ("dosage", "frequency", "duration", "instructions")):
        raise HTTPException(status_code=422, detail="Medication details must not be blank")
    reason = update.reason.strip()
    if not reason:
        raise HTTPException(status_code=422, detail="A reason for the medication update is required")

    medication.update({
        "dose": updated["dosage"],
        "frequency": updated["frequency"],
        "duration": updated["duration"],
        "instructions": updated["instructions"],
    })
    care_plan.plan_data = json.dumps(plan_data, ensure_ascii=False)
    history = MedicationHistory(
        patient_id=patient_id,
        care_plan_id=care_plan.id,
        medication_id=medication_id,
        medication_name=updated["name"],
        previous_details=json.dumps(previous, ensure_ascii=False),
        updated_details=json.dumps(updated, ensure_ascii=False),
        reason=reason,
        doctor_email=doctor.email,
    )
    try:
        db.add(care_plan)
        db.add(history)
        db.commit()
        db.refresh(care_plan)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to save medication update") from exc
    return _medication_list_response(db, care_plan, _load_plan_data(care_plan))
