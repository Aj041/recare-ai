
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, CarePlan, CheckIn, Patient
from schemas import PatientCreate, PatientResponse
from services.summary_service import SummaryInputError, generate_doctor_summary

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

@router.get("/{patient_id}/careplan/latest")
def get_latest_careplan(
    patient_id: int,
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    care_plan = db.query(CarePlan).filter(
        CarePlan.patient_id == patient_id
    ).order_by(
        CarePlan.created_at.desc(),
        CarePlan.id.desc()
    ).first()

    if not care_plan:
        raise HTTPException(
            status_code=404,
            detail="No care plan found for this patient"
        )

    try:
        structured_plan = json.loads(care_plan.plan_data)
    except (TypeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=500,
            detail="Stored care plan contains invalid structured data"
        )

    return {
        "care_plan_id": care_plan.id,
        "patient_id": care_plan.patient_id,
        "structured_plan": structured_plan,
        "created_at": care_plan.created_at
    }



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
                "medication_taken": checkins[-1].medication_taken,
                "temperature": checkins[-1].temperature,
                "temperature_c": checkins[-1].temperature_c,
            }
        )

    return summary
