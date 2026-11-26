
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, CarePlan, CheckIn, Patient
from schemas import (
    AdherenceUpdateRequest,
    CarePlanAdherenceResponse,
    PatientCreate,
    PatientResponse,
)
from services.summary_service import SummaryInputError, generate_doctor_summary

router = APIRouter(
    prefix="/api/patients",
    tags=["Patients"]
)

_ADHERENCE_STATUSES = {
    "unreported", "completed", "not_completed", "need_help", "not_applicable"
}


def _get_patient_care_plan(db: Session, patient_id: int, care_plan_id=None):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    query = db.query(CarePlan).filter(CarePlan.patient_id == patient_id)
    if care_plan_id is not None:
        query = query.filter(CarePlan.id == care_plan_id)
        care_plan = query.first()
    else:
        care_plan = query.order_by(
            CarePlan.created_at.desc(), CarePlan.id.desc()
        ).first()
    if not care_plan:
        raise HTTPException(status_code=404, detail="No care plan found for this patient")
    return care_plan


def _load_plan_data(care_plan: CarePlan) -> dict:
    try:
        data = json.loads(care_plan.plan_data)
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=500,
            detail="Stored care plan contains invalid structured data",
        ) from exc
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=500,
            detail="Stored care plan contains invalid structured data",
        )
    return data


def _ensure_adherence(plan_data: dict) -> tuple[dict, bool]:
    instructions = plan_data.get("recovery_instructions", [])
    if not isinstance(instructions, list) or any(
        not isinstance(instruction, str) for instruction in instructions
    ):
        raise HTTPException(
            status_code=500,
            detail="Stored recovery instructions are invalid",
        )

    previous = plan_data.get("adherence")
    previous_items = previous.get("items", []) if isinstance(previous, dict) else []
    if not isinstance(previous_items, list):
        previous_items = []
    previous_by_id = {
        item.get("item_id"): item
        for item in previous_items
        if isinstance(item, dict) and isinstance(item.get("item_id"), str)
    }

    items = []
    for index, instruction in enumerate(instructions):
        item_id = f"instruction_{index}"
        prior = previous_by_id.get(item_id)
        if not (
            isinstance(prior, dict)
            and prior.get("source_index") == index
            and prior.get("instruction") == instruction
        ):
            prior = {}

        status = prior.get("status", "unreported")
        if not isinstance(status, str) or status not in _ADHERENCE_STATUSES:
            status = "unreported"
        reported_at = prior.get("reported_at")
        if status == "unreported":
            reported_at = None
        elif isinstance(reported_at, str):
            try:
                datetime.fromisoformat(reported_at.replace("Z", "+00:00"))
            except ValueError:
                status = "unreported"
                reported_at = None
        else:
            status = "unreported"
            reported_at = None
        patient_note = prior.get("patient_note")
        if not isinstance(patient_note, str):
            patient_note = None

        items.append({
            **prior,
            "item_id": item_id,
            "source_index": index,
            "instruction": instruction,
            "status": status,
            "reported_at": reported_at,
            "patient_note": patient_note,
        })

    old_state = previous if isinstance(previous, dict) else {}
    adherence = {**old_state, "schema_version": 1, "items": items}
    changed = plan_data.get("adherence") != adherence
    plan_data["adherence"] = adherence
    return plan_data, changed


def _care_plan_adherence_response(care_plan: CarePlan, plan_data: dict):
    return {
        "care_plan_id": care_plan.id,
        "patient_id": care_plan.patient_id,
        "structured_plan": plan_data,
        "adherence": plan_data["adherence"],
        "created_at": care_plan.created_at,
    }


def _persist_plan_data(db: Session, care_plan: CarePlan, plan_data: dict):
    care_plan.plan_data = json.dumps(plan_data, ensure_ascii=False)
    db.add(care_plan)
    db.commit()
    db.refresh(care_plan)


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

@router.get("/{patient_id}/careplan/latest")
def get_latest_careplan(
    patient_id: int,
    db: Session = Depends(get_db),
):
    care_plan = _get_patient_care_plan(db, patient_id)
    structured_plan = _load_plan_data(care_plan)
    structured_plan, changed = _ensure_adherence(structured_plan)
    if changed:
        try:
            _persist_plan_data(db, care_plan, structured_plan)
        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=500, detail="Unable to initialize plan adherence"
            ) from exc

    return {
        "care_plan_id": care_plan.id,
        "patient_id": care_plan.patient_id,
        "structured_plan": structured_plan,
        "created_at": care_plan.created_at
    }


@router.get(
    "/{patient_id}/careplan/latest/adherence",
    response_model=CarePlanAdherenceResponse,
)
def get_latest_careplan_adherence(
    patient_id: int,
    db: Session = Depends(get_db),
):
    care_plan = _get_patient_care_plan(db, patient_id)
    plan_data = _load_plan_data(care_plan)
    plan_data, changed = _ensure_adherence(plan_data)
    if changed:
        try:
            _persist_plan_data(db, care_plan, plan_data)
        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=500, detail="Unable to initialize plan adherence"
            ) from exc
    return _care_plan_adherence_response(care_plan, plan_data)


@router.patch(
    "/{patient_id}/careplan/{care_plan_id}/adherence/{item_id}",
    response_model=CarePlanAdherenceResponse,
)
def update_careplan_adherence(
    patient_id: int,
    care_plan_id: int,
    item_id: str,
    update: AdherenceUpdateRequest,
    db: Session = Depends(get_db),
):
    care_plan = _get_patient_care_plan(db, patient_id, care_plan_id)
    plan_data = _load_plan_data(care_plan)
    plan_data, _ = _ensure_adherence(plan_data)

    item = next(
        (item for item in plan_data["adherence"]["items"] if item["item_id"] == item_id),
        None,
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Recovery instruction not found")

    item["status"] = update.status
    item["reported_at"] = (
        datetime.now(timezone.utc).isoformat()
        if update.status != "unreported"
        else None
    )
    item["patient_note"] = update.patient_note

    try:
        _persist_plan_data(db, care_plan, plan_data)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Unable to save adherence report"
        ) from exc
    return _care_plan_adherence_response(care_plan, plan_data)



@router.get("/{patient_id}/summary")
def get_patient_summary(
    patient_id: int,
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    care_plan = db.query(CarePlan).filter(
        CarePlan.patient_id == patient_id
    ).order_by(CarePlan.created_at.desc(), CarePlan.id.desc()).first()
    discharge_data = None
    if care_plan is not None:
        try:
            parsed_plan = json.loads(care_plan.plan_data)
        except (TypeError, json.JSONDecodeError):
            parsed_plan = None
        if isinstance(parsed_plan, dict):
            discharge_data = parsed_plan
            discharge_data.setdefault("patient_id", str(patient_id))

    checkins = db.query(CheckIn).filter(
        CheckIn.patient_id == patient_id
    ).order_by(CheckIn.created_at.asc(), CheckIn.id.asc()).all()
    summary_checkins_by_date = {}
    for checkin in checkins:
        try:
            symptoms = json.loads(checkin.symptoms or "[]")
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=500,
                detail="Stored check-in symptoms are invalid",
            ) from exc
        if not isinstance(symptoms, list) or any(
            not isinstance(symptom, str) for symptom in symptoms
        ):
            raise HTTPException(
                status_code=500,
                detail="Stored check-in symptoms are invalid",
            )
        date_string = checkin.created_at.date().isoformat()
        summary_checkins_by_date[date_string] = {
            "date": date_string,
            "pain_score": checkin.pain_level,
            "symptoms": symptoms,
        }

    active_alerts = db.query(Alert).filter(
        Alert.patient_id == patient_id,
        Alert.status == "active",
    ).order_by(Alert.created_at.desc(), Alert.id.desc()).all()
    summary_alerts = []
    for alert in active_alerts:
        try:
            supporting_check_ins = json.loads(
                alert.supporting_check_ins or "[]"
            )
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=500,
                detail="Stored alert evidence is invalid",
            ) from exc
        if not isinstance(supporting_check_ins, list):
            raise HTTPException(
                status_code=500,
                detail="Stored alert evidence is invalid",
            )
        summary_alerts.append(
            {
                "alert_id": str(alert.id),
                "alert_type": alert.severity,
                "rule_triggered": alert.rule_triggered,
                "explanation": alert.message,
                "supporting_check_ins": supporting_check_ins,
                "detected_at": (
                    alert.created_at.isoformat()
                    if alert.created_at is not None
                    else None
                ),
            }
        )

    alert_result = {
        "patient_id": str(patient_id),
        "alerts": summary_alerts,
    }

    try:
        summary = generate_doctor_summary(
            discharge_data=discharge_data,
            check_ins=list(summary_checkins_by_date.values()),
            alert_result=alert_result,
        )
    except SummaryInputError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate patient summary from stored data",
        ) from exc

    if care_plan is not None and discharge_data is None:
        summary["missing_information"].append(
            "Stored discharge plan has no structured interpretation."
        )

    if checkins:
        summary["latest_check_in"].update(
            {
                "reported_symptoms": checkins[-1].reported_symptoms,
                "notes": checkins[-1].notes,
                "medication_taken": checkins[-1].medication_taken,
                "temperature": checkins[-1].temperature,
                "temperature_c": checkins[-1].temperature_c,
            }
        )

    return summary
