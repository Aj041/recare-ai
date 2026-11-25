"""Deterministic doctor-facing summaries using existing service contracts.

``discharge_data`` follows ``DischargeSummaryInterpretation`` from
``ai_service`` (medications, recovery_instructions, warning_signs, follow_up,
missing_information), with an optional ``patient_id``. ``check_ins`` follows
``alert_engine.analyze_check_ins`` input: ascending unique YYYY-MM-DD dates,
optional 0–10 ``pain_score``, and optional string-list ``symptoms``.
``alert_result`` follows that engine's result with an ``alerts`` list. Missing
sources are accepted and reported; all narrative statements are derived from
provided data and rules.
"""

from collections import defaultdict
from datetime import date
from typing import Any


class SummaryInputError(ValueError):
    """Raised when summary inputs do not match the service contracts."""


def _text_list(value: Any, field: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise SummaryInputError(f"{field} must be a list of strings.")
    return [item for item in value if item.strip()]


def _normalize_check_ins(check_ins: Any) -> list[dict[str, Any]]:
    if check_ins is None:
        return []
    if not isinstance(check_ins, list):
        raise SummaryInputError("check_ins must be a list.")
    normalized = []
    prior_date = None
    for index, item in enumerate(check_ins):
        if not isinstance(item, dict):
            raise SummaryInputError(f"check_ins[{index}] must be an object.")
        if set(item) - {"date", "pain_score", "symptoms"}:
            raise SummaryInputError(
                f"check_ins[{index}] contains fields not supported by the alert engine."
            )
        date_value = item.get("date")
        if not isinstance(date_value, str):
            raise SummaryInputError(f"check_ins[{index}].date must be YYYY-MM-DD.")
        try:
            parsed_date = date.fromisoformat(date_value)
        except ValueError as exc:
            raise SummaryInputError(f"check_ins[{index}].date is invalid.") from exc
        if parsed_date.isoformat() != date_value or (prior_date and parsed_date <= prior_date):
            raise SummaryInputError("check_ins must have unique ascending YYYY-MM-DD dates.")
        prior_date = parsed_date

        pain = item.get("pain_score")
        if pain is not None and (
            isinstance(pain, bool)
            or not isinstance(pain, (int, float))
            or not 0 <= pain <= 10
        ):
            raise SummaryInputError(f"check_ins[{index}].pain_score must be between 0 and 10 or null.")
        symptoms = _text_list(item.get("symptoms", []), f"check_ins[{index}].symptoms")
        normalized.append({"date": date_value, "pain_score": pain, "symptoms": symptoms})
    return normalized


def _normalize_discharge(discharge_data: Any) -> dict[str, Any]:
    if discharge_data is None:
        return {
            "patient_id": None,
            "medications": [],
            "recovery_instructions": [],
            "warning_signs": [],
            "follow_up": None,
            "missing_information": [],
        }
    if not isinstance(discharge_data, dict):
        raise SummaryInputError("discharge_data must be an object or null.")
    medications = discharge_data.get("medications") or []
    if not isinstance(medications, list):
        raise SummaryInputError("discharge_data.medications must be a list.")
    clean_meds = []
    for index, medication in enumerate(medications):
        if not isinstance(medication, dict):
            raise SummaryInputError(f"medications[{index}] must be an object.")
        clean_meds.append(
            {
                key: medication.get(key) if isinstance(medication.get(key), str) and medication[key].strip() else "Not specified"
                for key in ("name", "dose", "frequency", "duration")
            }
        )
    follow_up = discharge_data.get("follow_up")
    if follow_up is not None and not isinstance(follow_up, str):
        raise SummaryInputError("discharge_data.follow_up must be a string or null.")
    patient_id = discharge_data.get("patient_id")
    if patient_id is not None and (not isinstance(patient_id, str) or not patient_id.strip()):
        raise SummaryInputError("patient_id must be a non-empty string when provided.")
    return {
        "patient_id": patient_id,
        "medications": clean_meds,
        "recovery_instructions": _text_list(
            discharge_data.get("recovery_instructions", []), "recovery_instructions"
        ),
        "warning_signs": _text_list(discharge_data.get("warning_signs", []), "warning_signs"),
        "follow_up": follow_up.strip() if follow_up and follow_up.strip() else None,
        "missing_information": _text_list(
            discharge_data.get("missing_information", []), "missing_information"
        ),
    }


def _normalize_alerts(alert_result: Any) -> tuple[list[dict[str, Any]], str | None]:
    if alert_result is None:
        return [], None
    if not isinstance(alert_result, dict):
        raise SummaryInputError("alert_result must be an object or null.")
    alerts = alert_result.get("alerts", [])
    if not isinstance(alerts, list):
        raise SummaryInputError("alert_result.alerts must be a list.")
    for index, alert in enumerate(alerts):
        if not isinstance(alert, dict):
            raise SummaryInputError(f"alerts[{index}] must be an object.")
        if not isinstance(alert.get("explanation"), str) or not isinstance(
            alert.get("supporting_check_ins"), list
        ):
            raise SummaryInputError(
                f"alerts[{index}] must include explanation and supporting_check_ins from alert_engine."
            )
    patient_id = alert_result.get("patient_id")
    if patient_id is not None and not isinstance(patient_id, str):
        raise SummaryInputError("alert_result.patient_id must be a string when provided.")
    return alerts, patient_id


def generate_doctor_summary(
    discharge_data: dict | None,
    check_ins: list[dict] | None,
    alert_result: dict | None,
) -> dict:
    """Build a concise structured summary solely from supplied service data."""
    discharge = _normalize_discharge(discharge_data)
    entries = _normalize_check_ins(check_ins)
    alerts, alert_patient_id = _normalize_alerts(alert_result)

    patient_id = discharge["patient_id"] or alert_patient_id
    if discharge["patient_id"] and alert_patient_id and discharge["patient_id"] != alert_patient_id:
        raise SummaryInputError("patient_id differs between discharge_data and alert_result.")

    latest = None
    if entries:
        latest_entry = entries[-1]
        latest = {
            "date": latest_entry["date"],
            "pain_score": latest_entry["pain_score"],
            "symptoms": latest_entry["symptoms"],
            "missing_fields": [
                field
                for field, value in (
                    ("pain_score", latest_entry["pain_score"]),
                    ("symptoms", latest_entry["symptoms"]),
                )
                if value is None or value == []
            ],
        }

    scored = [entry for entry in entries if entry["pain_score"] is not None]
    pain_trend = None
    if len(scored) >= 2:
        first, last = scored[0], scored[-1]
        delta = last["pain_score"] - first["pain_score"]
        direction = "increased" if delta > 0 else "decreased" if delta < 0 else "unchanged"
        pain_trend = {
            "direction": direction,
            "change": delta,
            "evidence": [
                {"date": entry["date"], "pain_score": entry["pain_score"]}
                for entry in scored
            ],
        }

    symptom_dates: dict[str, list[str]] = defaultdict(list)
    for entry in entries:
        for symptom in entry["symptoms"]:
            symptom_dates[symptom].append(entry["date"])
    symptom_trends = [
        {"symptom": symptom, "check_in_count": len(dates), "dates": dates}
        for symptom, dates in sorted(symptom_dates.items(), key=lambda pair: pair[0].casefold())
    ]

    missing = list(discharge["missing_information"])
    if discharge_data is None:
        missing.append("Discharge interpretation unavailable.")
    else:
        if not discharge["medications"]:
            missing.append("Documented medications unavailable.")
        if not discharge["recovery_instructions"]:
            missing.append("Discharge recovery instructions unavailable.")
        if not discharge["follow_up"]:
            missing.append("Discharge follow-up information unavailable.")
    if not entries:
        missing.append("Patient check-in history unavailable.")
    elif latest and latest["pain_score"] is None:
        missing.append("Pain score unavailable in the latest check-in.")
    if alert_result is None:
        missing.append("Alert analysis unavailable.")
    elif not alerts:
        missing.append("No active alerts were supplied.")
    # Keep the list concise while retaining source order.
    missing = list(dict.fromkeys(missing))

    statements = []
    if discharge["recovery_instructions"]:
        statements.append(f'{len(discharge["recovery_instructions"])} discharge recovery instruction(s) documented')
    if latest:
        latest_parts = [f'latest check-in {latest["date"]}']
        if latest["pain_score"] is not None:
            latest_parts.append(f'patient-reported pain {latest["pain_score"]}/10')
        if latest["symptoms"]:
            latest_parts.append("reported symptoms: " + ", ".join(latest["symptoms"]))
        statements.append("; ".join(latest_parts))
    if pain_trend:
        statements.append(f'patient-reported pain {pain_trend["direction"]} by {pain_trend["change"]:g} point(s) across recorded check-ins')
    statements.append(f"{len(alerts)} active alert(s)" if alerts else "no active alerts supplied")
    overview = ". ".join(statements).rstrip(".") + "." if statements else "No discharge or check-in information is available."

    return {
        "patient_id": patient_id,
        "overview": overview,
        "discharge": {
            "recovery_instructions": discharge["recovery_instructions"],
            "medications": discharge["medications"],
            "warning_signs": discharge["warning_signs"],
            "follow_up": discharge["follow_up"],
        },
        "latest_check_in": latest,
        "trends": {"pain": pain_trend, "symptoms": symptom_trends},
        "active_alerts": alerts,
        "missing_information": missing,
    }
