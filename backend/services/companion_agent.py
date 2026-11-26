"""Evidence retrieval and supervised recovery-companion orchestration."""

import hashlib
import json
import os

from sqlalchemy.orm import Session

from models import Alert, CarePlan, CheckIn, CompanionObservation, CompanionRun, Patient, ProposedTask
from routes.checkins import _get_alert_config
from services.ai_service import generate_recovery_companion_reasoning
from services.alert_engine import AlertInputError, analyze_check_ins


class CompanionEvidenceError(ValueError):
    """Raised when stored context or model evidence references are invalid."""


class CompanionContextError(ValueError):
    """Raised when patient context cannot be safely retrieved or validated."""


def _json_list(value, label):
    try:
        parsed = json.loads(value or "[]")
    except (TypeError, json.JSONDecodeError) as exc:
        raise CompanionContextError(f"Stored {label} is invalid JSON.") from exc
    if not isinstance(parsed, list):
        raise CompanionContextError(f"Stored {label} must be a list.")
    return parsed


def retrieve_recovery_context(db: Session, patient_id: int) -> dict:
    """Load the latest plan, patient check-ins, adherence, and active alerts."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise LookupError("Patient not found")

    plan = db.query(CarePlan).filter(CarePlan.patient_id == patient_id).order_by(
        CarePlan.created_at.desc(), CarePlan.id.desc()
    ).first()
    plan_data = {}
    if plan is not None:
        try:
            plan_data = json.loads(plan.plan_data)
        except (TypeError, json.JSONDecodeError) as exc:
            raise CompanionContextError("Stored discharge plan is invalid JSON.") from exc
        if not isinstance(plan_data, dict):
            raise CompanionContextError("Stored discharge plan must be an object.")

    checkin_rows = db.query(CheckIn).filter(CheckIn.patient_id == patient_id).order_by(
        CheckIn.created_at.asc(), CheckIn.id.asc()
    ).all()
    evidence = []
    engine_by_date = {}
    for row in checkin_rows:
        date_text = row.created_at.date().isoformat()
        symptoms = _json_list(row.symptoms, "check-in symptoms")
        if any(not isinstance(item, str) for item in symptoms):
            raise CompanionContextError("Stored check-in symptoms must contain strings.")
        record = {
            "evidence_id": f"checkin:{row.id}",
            "record_type": "patient_check_in",
            "check_in_id": row.id,
            "date": date_text,
            "pain_level": row.pain_level,
            "symptoms": symptoms,
            "reported_symptoms": row.reported_symptoms,
            "notes": row.notes,
        }
        evidence.append(record)
        # Existing check-in integration keeps the last record for each date.
        engine_by_date[date_text] = {
            "date": date_text,
            "pain_score": row.pain_level,
            "symptoms": symptoms,
        }

    if plan is not None:
        plan_evidence = {
            "evidence_id": f"care_plan:{plan.id}",
            "record_type": "discharge_plan",
            "care_plan_id": plan.id,
            "plan": {key: value for key, value in plan_data.items() if key != "adherence"},
        }
        evidence.append(plan_evidence)
        adherence = plan_data.get("adherence", {})
        items = adherence.get("items", []) if isinstance(adherence, dict) else []
        if not isinstance(items, list):
            raise CompanionContextError("Stored adherence items must be a list.")
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get("item_id"), str):
                raise CompanionContextError("Stored adherence item is invalid.")
            evidence.append({
                "evidence_id": f"adherence:{plan.id}:{item['item_id']}",
                "record_type": "patient_reported_adherence",
                "care_plan_id": plan.id,
                "item_id": item["item_id"],
                "instruction": item.get("instruction"),
                "status": item.get("status", "unreported"),
                "reported_at": item.get("reported_at"),
                "patient_note": item.get("patient_note"),
            })

    alerts = db.query(Alert).filter(
        Alert.patient_id == patient_id,
        Alert.status == "active",
    ).order_by(Alert.created_at.asc(), Alert.id.asc()).all()
    for alert in alerts:
        evidence.append({
            "evidence_id": f"alert:{alert.id}",
            "record_type": "existing_alert",
            "alert_id": alert.id,
            "severity": alert.severity,
            "message": alert.message,
            "rule_triggered": alert.rule_triggered,
            "supporting_check_ins": _json_list(alert.supporting_check_ins, "alert evidence"),
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        })

    try:
        deterministic = analyze_check_ins(
            patient_id=str(patient_id),
            check_ins=list(engine_by_date.values()),
            config=_get_alert_config(db, patient_id),
        )
    except AlertInputError as exc:
        raise CompanionContextError("Patient check-in or alert configuration is invalid.") from exc

    # Map deterministic rule evidence back to persisted check-in IDs by date.
    id_by_date = {}
    for row in checkin_rows:
        id_by_date[row.created_at.date().isoformat()] = row.id
    rule_alerts = []
    for alert in deterministic["alerts"]:
        refs = [f"checkin:{id_by_date[item['date']]}" for item in alert["supporting_check_ins"] if item.get("date") in id_by_date]
        alert_record = {
            "evidence_id": f"rule_alert:{alert['alert_id']}",
            "record_type": "deterministic_system_observation",
            "alert_type": alert["alert_type"],
            "rule_triggered": alert["rule_triggered"],
            "explanation": alert["explanation"],
            "supporting_check_ins": alert["supporting_check_ins"],
            "supporting_evidence_refs": refs,
        }
        evidence.append(alert_record)
        rule_alerts.append(alert_record)

    deterministic_result = {
        "patient_id": str(patient_id),
        "alerts": deterministic["alerts"],
        "insufficient_history": deterministic["insufficient_history"],
        "insufficient_history_reason": deterministic["insufficient_history_reason"],
    }
    return {
        "patient": patient,
        "latest_care_plan": plan,
        "check_ins": checkin_rows,
        "active_alerts": alerts,
        "evidence": evidence,
        "deterministic_alerts": deterministic_result,
    }


def _decode_refs(value):
    try:
        refs = json.loads(value)
    except (TypeError, json.JSONDecodeError) as exc:
        raise CompanionEvidenceError("Stored agent evidence references are invalid.") from exc
    if not isinstance(refs, list):
        raise CompanionEvidenceError("Agent evidence references must be a list.")
    return refs


def _serialize_run(db, run, context, reused):
    observations = db.query(CompanionObservation).filter(
        CompanionObservation.run_id == run.id
    ).order_by(CompanionObservation.id.asc()).all()
    tasks = db.query(ProposedTask).filter(
        ProposedTask.run_id == run.id
    ).order_by(ProposedTask.id.asc()).all()
    return {
        "run_id": run.id,
        "patient_id": run.patient_id,
        "evidence_hash": run.evidence_hash,
        "created_at": run.created_at,
        "reused_existing_run": reused,
        "deterministic_alerts": context["deterministic_alerts"]["alerts"],
        "evidence": context["evidence"],
        "observations": [
            {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "evidence_refs": _decode_refs(item.evidence_refs),
                "source": item.source_type,
                "created_at": item.created_at,
            }
            for item in observations
        ],
        "proposed_tasks": [
            {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "reason": item.reason,
                "evidence_refs": _decode_refs(item.evidence_refs),
                "status": item.status,
                "created_at": item.created_at,
                "reviewed_by": item.reviewed_by,
                "reviewed_at": item.reviewed_at,
                "review_note": item.review_note,
            }
            for item in tasks
        ],
    }


def run_recovery_companion(db: Session, patient_id: int) -> dict:
    """Retrieve evidence, reason over it once, and persist idempotently."""
    context = retrieve_recovery_context(db, patient_id)
    evidence = context["evidence"]
    canonical = json.dumps(evidence, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    evidence_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    existing = db.query(CompanionRun).filter(
        CompanionRun.patient_id == patient_id,
        CompanionRun.evidence_hash == evidence_hash,
    ).first()
    if existing:
        return _serialize_run(db, existing, context, True)

    reasoning = generate_recovery_companion_reasoning(evidence)
    valid_ids = {item["evidence_id"] for item in evidence}
    for key in ("observations", "proposed_tasks"):
        if not isinstance(reasoning, dict) or not isinstance(reasoning.get(key), list):
            raise CompanionEvidenceError("Groq response is missing its structured output lists.")
        for result in reasoning[key]:
            refs = result.get("evidence_refs") if isinstance(result, dict) else None
            if not isinstance(refs, list) or not refs or any(ref not in valid_ids for ref in refs):
                raise CompanionEvidenceError("Groq response cited evidence outside retrieved patient records.")
    tasks = reasoning["proposed_tasks"][:3]

    try:
        run = CompanionRun(
            patient_id=patient_id,
            evidence_hash=evidence_hash,
            model=os.getenv("GROQ_MODEL", "unknown"),
            evidence_snapshot=canonical,
        )
        db.add(run)
        db.flush()

        # Persist deterministic alerts as clearly labeled system observations.
        for alert in context["deterministic_alerts"]["alerts"]:
            evidence_record = next(
                item for item in evidence
                if item["evidence_id"] == f"rule_alert:{alert['alert_id']}"
            )
            refs = evidence_record["supporting_evidence_refs"] or [evidence_record["evidence_id"]]
            db.add(CompanionObservation(
                run_id=run.id,
                source_type="system_generated",
                title=alert["rule_triggered"],
                description=alert["explanation"],
                evidence_refs=json.dumps(refs, ensure_ascii=False),
            ))
        for item in reasoning["observations"]:
            db.add(CompanionObservation(
                run_id=run.id,
                source_type="agent_generated",
                title=item["title"],
                description=item["description"],
                evidence_refs=json.dumps(item["evidence_refs"], ensure_ascii=False),
            ))
        for item in tasks:
            db.add(ProposedTask(
                run_id=run.id,
                patient_id=patient_id,
                title=item["title"],
                description=item["description"],
                reason=item["reason"],
                evidence_refs=json.dumps(item["evidence_refs"], ensure_ascii=False),
                status="pending",
            ))
        db.commit()
        db.refresh(run)
    except Exception:
        db.rollback()
        raise
    return _serialize_run(db, run, context, False)
