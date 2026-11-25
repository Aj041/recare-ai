
import json
from datetime import datetime, time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Patient, CheckIn, Alert, CarePlan
from schemas import CheckInCreate
from services.alert_engine import (
    AlertConfig,
    AlertInputError,
    WarningSignRule,
    analyze_check_ins,
)

router = APIRouter(
    prefix="/api",
    tags=["Patient History"]
)


def _get_alert_config(db: Session, patient_id: int) -> AlertConfig:
    care_plan = db.query(CarePlan).filter(
        CarePlan.patient_id == patient_id
    ).order_by(CarePlan.created_at.desc(), CarePlan.id.desc()).first()

    if care_plan is None:
        return AlertConfig()

    try:
        plan_data = json.loads(care_plan.plan_data)
    except (TypeError, json.JSONDecodeError):
        return AlertConfig()

    warning_signs = plan_data.get("warning_signs", []) if isinstance(plan_data, dict) else []
    if not isinstance(warning_signs, list) or any(
        not isinstance(sign, str) or not sign.strip()
        for sign in warning_signs
    ):
        raise AlertInputError("The stored care plan has invalid warning signs.")

    return AlertConfig(
        warning_sign_rules={
            sign: WarningSignRule(
                alert_type="discharge_warning_sign",
                explanation=(
                    "A patient-reported symptom matches a warning sign documented "
                    f"in the discharge plan: {sign}. Clinician review is recommended."
                ),
            )
            for sign in warning_signs
        }
    )


# GET patient check-in history
@router.get("/patients/{patient_id}/history")
def get_patient_history(
    patient_id: int,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    history = db.query(CheckIn).filter(
        CheckIn.patient_id == patient_id
    ).order_by(CheckIn.created_at.asc(), CheckIn.id.asc()).all()

    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "total_checkins": len(history),
        "history": [
            {
                "id": item.id,
                "pain_level": item.pain_level,
                "temperature": item.temperature,
                "temperature_c": item.temperature_c,
                "medication_taken": item.medication_taken,
                "reported_symptoms": item.reported_symptoms,
                "symptoms": item.symptoms,
                "mood": item.mood,
                "notes": item.notes,
                "created_at": item.created_at
            }
            for item in history
        ]
    }


# POST create check-in and generate alerts
@router.post("/checkins")
def create_checkin(
    checkin: CheckInCreate,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.id == checkin.patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if (
        checkin.pain_level is not None
        and checkin.pain_score is not None
        and checkin.pain_level != checkin.pain_score
    ):
        raise HTTPException(
            status_code=422,
            detail="pain_level and pain_score must match when both are provided",
        )

    pain_level = (
        checkin.pain_score
        if checkin.pain_score is not None
        else checkin.pain_level
    )

    try:
        checkin_date = (
            datetime.strptime(checkin.date, "%Y-%m-%d").date()
            if checkin.date
            else datetime.utcnow().date()
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="date must use YYYY-MM-DD format",
        ) from exc

    new_checkin = CheckIn(
        patient_id=checkin.patient_id,
        pain_level=pain_level,
        temperature=checkin.temperature,
        temperature_c=checkin.temperature_c,
        medication_taken=checkin.medication_taken,
        reported_symptoms=checkin.reported_symptoms,
        symptoms=json.dumps(checkin.symptoms or []),
        mood=checkin.mood,
        notes=checkin.notes,
        created_at=datetime.combine(checkin_date, time.min)
    )

    try:
        db.add(new_checkin)
        db.flush()

        # Retrieve all patient check-ins
        history = db.query(CheckIn).filter(
            CheckIn.patient_id == checkin.patient_id
        ).order_by(CheckIn.created_at.asc(), CheckIn.id.asc()).all()

        # Keep latest check-in for each date
        daily_checkins = {}

        for item in history:
            symptoms = json.loads(item.symptoms or "[]")
            date_string = item.created_at.date().isoformat()

            daily_checkins[date_string] = {
                "date": date_string,
                "pain_score": item.pain_level,
                "symptoms": symptoms
            }

        engine_input = list(daily_checkins.values())

        # Run Person 3 alert engine
        result = analyze_check_ins(
            patient_id=str(checkin.patient_id),
            check_ins=engine_input,
            config=_get_alert_config(db, checkin.patient_id),
        )

        # Save alerts without duplicates
        saved_alerts = []

        for item in result["alerts"]:
            existing = db.query(Alert).filter(
                Alert.patient_id == checkin.patient_id,
                Alert.severity == item["alert_type"],
                Alert.message == item["explanation"],
                Alert.rule_triggered == item["rule_triggered"],
                Alert.supporting_check_ins
                == json.dumps(item["supporting_check_ins"], ensure_ascii=False),
            ).first()

            if existing:
                continue

            new_alert = Alert(
                patient_id=checkin.patient_id,
                severity=item["alert_type"],
                message=item["explanation"],
                rule_triggered=item["rule_triggered"],
                supporting_check_ins=json.dumps(
                    item["supporting_check_ins"],
                    ensure_ascii=False,
                ),
                status="active"
            )

            db.add(new_alert)

            saved_alerts.append({
                "alert_type": item["alert_type"],
                "rule_triggered": item["rule_triggered"],
                "explanation": item["explanation"],
                "alert_id": item["alert_id"]
            })

        db.commit()

        return {
            "message": "Patient check-in saved successfully",
            "checkin_id": new_checkin.id,
            "patient_id": new_checkin.patient_id,
            "pain_level": new_checkin.pain_level,
            "pain_score": new_checkin.pain_level,
            "temperature": new_checkin.temperature,
            "temperature_c": new_checkin.temperature_c,
            "medication_taken": new_checkin.medication_taken,
            "reported_symptoms": new_checkin.reported_symptoms,
            "symptoms": checkin.symptoms or [],
            "generated_alerts": saved_alerts,
            "insufficient_history": result["insufficient_history"],
            "insufficient_history_reason": result["insufficient_history_reason"],
            "created_at": new_checkin.created_at
        }

    except AlertInputError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to process check-in: {str(exc)}",
        ) from exc
