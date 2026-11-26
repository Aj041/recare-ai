"""Doctor-authenticated supervised recovery companion API."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import CompanionObservation, CompanionRun, Patient, ProposedTask
from schemas import (
    CompanionObservationResponse,
    CompanionRunResponse,
    CompanionTaskReviewRequest,
    ProposedTaskResponse,
)
from services.ai_service import AIServiceError
from services.companion_agent import (
    CompanionContextError,
    CompanionEvidenceError,
    run_recovery_companion,
)
from services.doctor_auth import get_current_doctor

router = APIRouter(prefix="/api/patients", tags=["Recovery Companion"])


def _require_patient(db: Session, patient_id: int) -> None:
    if db.query(Patient.id).filter(Patient.id == patient_id).first() is None:
        raise HTTPException(status_code=404, detail="Patient not found")


def _observation_response(item: CompanionObservation):
    try:
        refs = json.loads(item.evidence_refs)
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Stored observation evidence is invalid") from exc
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "evidence_refs": refs,
        "source": item.source_type,
        "created_at": item.created_at,
    }


def _task_response(item: ProposedTask):
    try:
        refs = json.loads(item.evidence_refs)
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Stored task evidence is invalid") from exc
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "reason": item.reason,
        "evidence_refs": refs,
        "status": item.status,
        "created_at": item.created_at,
        "reviewed_by": item.reviewed_by,
        "reviewed_at": item.reviewed_at,
        "review_note": item.review_note,
    }


def _task_for_patient(db: Session, patient_id: int, task_id: int) -> ProposedTask:
    task = db.query(ProposedTask).filter(
        ProposedTask.id == task_id,
        ProposedTask.patient_id == patient_id,
    ).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Proposed task not found for this patient")
    return task


@router.post(
    "/{patient_id}/agent/run",
    response_model=CompanionRunResponse,
    summary="Run the supervised Recovery Companion",
)
def run_agent(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor=Depends(get_current_doctor),
):
    try:
        return run_recovery_companion(db, patient_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CompanionContextError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except CompanionEvidenceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except AIServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get(
    "/{patient_id}/agent/observations",
    response_model=list[CompanionObservationResponse],
)
def get_agent_observations(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor=Depends(get_current_doctor),
):
    _require_patient(db, patient_id)
    items = db.query(CompanionObservation).join(
        CompanionRun, CompanionObservation.run_id == CompanionRun.id
    ).filter(
        CompanionRun.patient_id == patient_id
    ).order_by(CompanionObservation.created_at.desc(), CompanionObservation.id.desc()).all()
    return [_observation_response(item) for item in items]


@router.get(
    "/{patient_id}/agent/tasks",
    response_model=list[ProposedTaskResponse],
)
def get_agent_tasks(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor=Depends(get_current_doctor),
):
    _require_patient(db, patient_id)
    items = db.query(ProposedTask).filter(
        ProposedTask.patient_id == patient_id
    ).order_by(ProposedTask.created_at.desc(), ProposedTask.id.desc()).all()
    return [_task_response(item) for item in items]


def _review_task(
    patient_id: int,
    task_id: int,
    status: str,
    review: CompanionTaskReviewRequest | None,
    db: Session,
    doctor,
):
    task = _task_for_patient(db, patient_id, task_id)
    if task.status != "pending":
        raise HTTPException(status_code=409, detail="Only pending tasks can be reviewed")
    task.status = status
    task.reviewed_by = doctor.email
    task.reviewed_at = datetime.now(timezone.utc)
    task.review_note = review.review_note if review else None
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_response(task)


@router.post(
    "/{patient_id}/agent/tasks/{task_id}/approve",
    response_model=ProposedTaskResponse,
)
def approve_agent_task(
    patient_id: int,
    task_id: int,
    review: CompanionTaskReviewRequest | None = None,
    db: Session = Depends(get_db),
    doctor=Depends(get_current_doctor),
):
    return _review_task(patient_id, task_id, "approved", review, db, doctor)


@router.post(
    "/{patient_id}/agent/tasks/{task_id}/reject",
    response_model=ProposedTaskResponse,
)
def reject_agent_task(
    patient_id: int,
    task_id: int,
    review: CompanionTaskReviewRequest | None = None,
    db: Session = Depends(get_db),
    doctor=Depends(get_current_doctor),
):
    return _review_task(patient_id, task_id, "rejected", review, db, doctor)
