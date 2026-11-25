"""Deterministic, explainable recovery alerts from patient check-ins.

Input contract for ``analyze_check_ins`` (no API schema exists yet)::

    {
        "patient_id": "opaque patient identifier",
        "check_ins": [
            {"date": "YYYY-MM-DD", "pain_score": 0, "symptoms": ["..."]}
        ]
    }

``pain_score`` is optional and, when present, is a patient-reported 0–10
score. ``symptoms`` is optional and defaults to an empty list. Check-ins must
be unique and ordered oldest to newest. Warning-sign rules are supplied by
the caller; this module does not assert that a symptom is medically dangerous.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
import hashlib
import json
import math
from typing import Any


class AlertInputError(ValueError):
    """Raised when check-in data or alert configuration is invalid."""


@dataclass(frozen=True)
class WarningSignRule:
    """Caller-defined mapping from one documented symptom to an alert."""

    alert_type: str
    explanation: str


@dataclass(frozen=True)
class AlertConfig:
    """Configurable trend settings and caller-defined symptom rules.

    Defaults are MVP detection settings, not clinical thresholds. Configure
    these for the intended care pathway before production use.
    """

    pain_trend_min_check_ins: int = 3
    pain_trend_min_increase: float = 2.0
    warning_sign_rules: dict[str, WarningSignRule | dict[str, str]] = field(
        default_factory=dict
    )


def _validate_history(patient_id: Any, check_ins: Any) -> list[dict[str, Any]]:
    if not isinstance(patient_id, str) or not patient_id.strip():
        raise AlertInputError("patient_id must be a non-empty string.")
    if not isinstance(check_ins, list):
        raise AlertInputError("check_ins must be a list of check-in objects.")

    normalized = []
    prior_date = None
    for index, item in enumerate(check_ins):
        if not isinstance(item, dict):
            raise AlertInputError(f"check_ins[{index}] must be an object.")
        unknown = set(item) - {"date", "pain_score", "symptoms"}
        if unknown:
            raise AlertInputError(
                f"check_ins[{index}] has unsupported fields: {', '.join(sorted(unknown))}."
            )
        date_value = item.get("date")
        if not isinstance(date_value, str):
            raise AlertInputError(f"check_ins[{index}].date must be YYYY-MM-DD.")
        try:
            parsed_date = date.fromisoformat(date_value)
        except ValueError as exc:
            raise AlertInputError(
                f"check_ins[{index}].date must be a valid YYYY-MM-DD date."
            ) from exc
        if parsed_date.isoformat() != date_value:
            raise AlertInputError(f"check_ins[{index}].date must use YYYY-MM-DD format.")
        if prior_date is not None and parsed_date <= prior_date:
            raise AlertInputError("check_ins must be ordered by unique ascending dates.")
        prior_date = parsed_date

        pain = item.get("pain_score")
        if pain is not None:
            if isinstance(pain, bool) or not isinstance(pain, (int, float)):
                raise AlertInputError(f"check_ins[{index}].pain_score must be a number or null.")
            if not math.isfinite(pain) or pain < 0 or pain > 10:
                raise AlertInputError(f"check_ins[{index}].pain_score must be between 0 and 10.")

        symptoms = item.get("symptoms", [])
        if not isinstance(symptoms, list) or any(
            not isinstance(symptom, str) or not symptom.strip() for symptom in symptoms
        ):
            raise AlertInputError(f"check_ins[{index}].symptoms must be a list of non-empty strings.")
        normalized.append(
            {"date": date_value, "pain_score": pain, "symptoms": symptoms}
        )
    return normalized


def _normalize_warning_rules(
    rules: dict[str, WarningSignRule | dict[str, str]],
) -> dict[str, WarningSignRule]:
    if not isinstance(rules, dict):
        raise AlertInputError("warning_sign_rules must be a mapping of symptom to rule.")
    normalized = {}
    for symptom, rule in rules.items():
        if not isinstance(symptom, str) or not symptom.strip():
            raise AlertInputError("Warning-sign rule symptoms must be non-empty strings.")
        if isinstance(rule, dict):
            try:
                rule = WarningSignRule(
                    alert_type=rule["alert_type"], explanation=rule["explanation"]
                )
            except (KeyError, TypeError) as exc:
                raise AlertInputError(
                    f"Rule for {symptom!r} requires alert_type and explanation."
                ) from exc
        if not isinstance(rule, WarningSignRule) or not rule.alert_type.strip() or not rule.explanation.strip():
            raise AlertInputError(f"Rule for {symptom!r} must have alert_type and explanation.")
        normalized[symptom.casefold()] = rule
    return normalized


def analyze_check_ins(
    patient_id: str,
    check_ins: list[dict[str, Any]],
    config: AlertConfig | None = None,
    detected_at: datetime | None = None,
) -> dict[str, Any]:
    """Analyze chronological check-ins and return explainable alert records.

    Output contains ``patient_id``, ``alerts``, ``insufficient_history``, and
    ``insufficient_history_reason``. Each alert has a stable ``alert_id``
    derived from its rule and evidence, allowing an API or database to upsert
    instead of creating duplicate alerts on repeated analyses.
    """
    entries = _validate_history(patient_id, check_ins)
    config = config or AlertConfig()
    if not isinstance(config, AlertConfig):
        raise AlertInputError("config must be an AlertConfig instance.")
    if (
        isinstance(config.pain_trend_min_check_ins, bool)
        or not isinstance(config.pain_trend_min_check_ins, int)
        or config.pain_trend_min_check_ins < 2
    ):
        raise AlertInputError("pain_trend_min_check_ins must be an integer of at least 2.")
    if (
        isinstance(config.pain_trend_min_increase, bool)
        or not isinstance(config.pain_trend_min_increase, (int, float))
        or not math.isfinite(config.pain_trend_min_increase)
        or config.pain_trend_min_increase <= 0
    ):
        raise AlertInputError("pain_trend_min_increase must be a positive finite number.")
    warning_rules = _normalize_warning_rules(config.warning_sign_rules)

    if detected_at is None:
        detected_at = datetime.now(timezone.utc)
    elif not isinstance(detected_at, datetime):
        raise AlertInputError("detected_at must be a datetime.")
    if detected_at.tzinfo is None:
        detected_at = detected_at.replace(tzinfo=timezone.utc)
    timestamp = detected_at.astimezone(timezone.utc).isoformat()

    alerts: list[dict[str, Any]] = []
    seen_evidence: set[tuple[str, str]] = set()

    def add_alert(
        alert_type: str,
        rule: str,
        explanation: str,
        evidence: list[dict[str, Any]],
        dedupe_evidence_key: str | None = None,
    ) -> None:
        evidence_key = json.dumps(evidence, sort_keys=True, separators=(",", ":"))
        dedupe_key = (rule, dedupe_evidence_key or evidence_key)
        if dedupe_key in seen_evidence:
            return
        seen_evidence.add(dedupe_key)
        stable_id = hashlib.sha256(
            f"{patient_id}|{rule}|{evidence_key}".encode("utf-8")
        ).hexdigest()[:24]
        alerts.append(
            {
                "alert_id": stable_id,
                "alert_type": alert_type,
                "rule_triggered": rule,
                "explanation": explanation,
                "supporting_check_ins": evidence,
                "detected_at": timestamp,
            }
        )

    scored = [entry for entry in entries if entry["pain_score"] is not None]
    enough_for_trend = len(scored) >= config.pain_trend_min_check_ins
    if enough_for_trend:
        window = scored[-config.pain_trend_min_check_ins :]
        values = [entry["pain_score"] for entry in window]
        increase = values[-1] - values[0]
        if all(later > earlier for earlier, later in zip(values, values[1:])) and increase >= config.pain_trend_min_increase:
            evidence = [
                {"date": entry["date"], "pain_score": entry["pain_score"]}
                for entry in window
            ]
            add_alert(
                "pain_trend",
                "sustained_increase_in_reported_pain",
                "Patient-reported pain increased at each recorded check-in in the analysis window "
                f"({values[0]} to {values[-1]}), meeting the configured increase of "
                f"{config.pain_trend_min_increase:g} points.",
                evidence,
            )

    for entry in entries:
        for symptom in entry["symptoms"]:
            rule = warning_rules.get(symptom.casefold())
            if rule is None:
                continue
            add_alert(
                rule.alert_type,
                f"configured_symptom:{symptom.casefold()}",
                rule.explanation,
                [{"date": entry["date"], "symptom": symptom}],
                dedupe_evidence_key=entry["date"],
            )

    insufficient = len(entries) < config.pain_trend_min_check_ins or len(scored) < config.pain_trend_min_check_ins
    reason = None
    if insufficient:
        reason = (
            f"Pain trend analysis requires {config.pain_trend_min_check_ins} check-ins with pain scores; "
            f"received {len(scored)}."
        )
    return {
        "patient_id": patient_id,
        "alerts": alerts,
        "insufficient_history": insufficient,
        "insufficient_history_reason": reason,
    }
