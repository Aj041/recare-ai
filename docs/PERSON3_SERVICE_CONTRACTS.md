# Person 3 Service Contracts

This document describes the current contracts implemented in `backend/services/`. It is based on the service source files; it does not define API or database schemas.

## 1. PDF extraction service

Source: `backend/services/pdf_service.py`

```python
extract_text_from_pdf(pdf_bytes: bytes) -> str
```

- **Input:** PDF contents as `bytes`. Empty bytes and values that are not bytes are rejected.
- **Output:** Text extracted from every page, with two newline characters between page texts. The PDF is processed from memory and the PyMuPDF document is closed, including on errors.
- **Exception:** `PDFExtractionError` for empty or incorrectly typed input, password-protected PDFs, invalid/corrupted PDFs, and PDFs with no extractable text. The no-text message explains that OCR is not implemented.

## 2. AI interpretation service

Source: `backend/services/ai_service.py`

```python
interpret_discharge_summary(extracted_text: str) -> dict
```

- **Input:** Non-empty string containing extracted discharge-summary text.
- **Output:** Dictionary validated by `DischargeSummaryInterpretation` (Pydantic):

  ```json
  {
    "medications": [
      {"name": "string", "dose": "string", "frequency": "string", "duration": "string"}
    ],
    "recovery_instructions": ["string"],
    "warning_signs": ["string"],
    "follow_up": "string",
    "missing_information": ["string"]
  }
  ```

  All fields are required by the current Pydantic model. Medication fields and `follow_up` are strings; the prompt directs the model to use `"Not specified"` for undocumented medication values or follow-up. The current model does **not** permit `null` for `follow_up`. Empty collections are used when there are no documented list entries. Extra fields are forbidden in the top-level object and medication objects.
- **Exception:** `AIServiceError` for empty input, missing/unconfigured settings, empty or structurally invalid model responses, and Groq request failures.
- **Configuration:** `python-dotenv` loads `backend/.env`. The service reads `GROQ_API_KEY` and `GROQ_MODEL`; neither is logged. Set the expected model as `GROQ_MODEL=openai/gpt-oss-120b` in the runtime environment. **Current `backend/.env.example` instead contains `GROQ_MODEL=llama-3.3-70b-versatile`; it must be updated separately if it is intended to show the expected model.** `GROQ_API_KEY` in the example is a placeholder and must be supplied privately at runtime.

The prompt treats extracted document text as untrusted data and asks the model not to invent facts or provide diagnosis, prescribing, or medication-change advice. The function makes a live Groq request when called; it does not fall back to deterministic interpretation.

## 3. Alert engine

Source: `backend/services/alert_engine.py`

```python
analyze_check_ins(
    patient_id: str,
    check_ins: list[dict[str, Any]],
    config: AlertConfig | None = None,
    detected_at: datetime | None = None,
) -> dict[str, Any]
```

### Check-in input and validation

- `patient_id` must be a non-empty string.
- `check_ins` must be a list, ordered by unique ascending dates.
- Each check-in must be an object with no fields other than:
  - `date` (required): valid `YYYY-MM-DD` string.
  - `pain_score` (optional): finite number from 0 through 10, or `null`. Booleans are rejected as numbers.
  - `symptoms` (optional): list of non-empty strings; defaults to `[]`.
- Invalid input/configuration raises `AlertInputError`.

### Configuration

`AlertConfig` is a frozen dataclass with these constructor fields and defaults:

```python
AlertConfig(
    pain_trend_min_check_ins=3,
    pain_trend_min_increase=2.0,
    warning_sign_rules={},
)
```

The pain rule examines the latest configured number of recorded pain scores. It alerts only when each score is strictly higher than the preceding score and the first-to-last increase meets `pain_trend_min_increase`. These are configurable MVP settings, not universal clinical thresholds.

`warning_sign_rules` maps documented symptom text to either a `WarningSignRule(alert_type, explanation)` or a dictionary with those two keys. Matching is case-insensitive exact text matching after `casefold()`. No warning-sign rules are enabled by default. The engine reports the configured match; it does not establish clinical danger.

### Result and alert evidence

The result has this shape:

```json
{
  "patient_id": "string",
  "alerts": [],
  "insufficient_history": false,
  "insufficient_history_reason": null
}
```

Each alert contains:

```json
{
  "alert_id": "stable 24-character hex identifier",
  "alert_type": "string",
  "rule_triggered": "string",
  "explanation": "string",
  "supporting_check_ins": [],
  "detected_at": "UTC ISO-8601 datetime"
}
```

Pain-trend evidence entries contain `date` and `pain_score`. Warning-sign evidence entries contain `date` and the singular field **`symptom`** (not `symptoms`), whose value is the text recorded in that check-in. Duplicate rule/evidence alerts are suppressed within one analysis result; `alert_id` is stable for the same patient, rule, and evidence so a caller can upsert across repeated analyses. The service itself does not persist alerts.

`detected_at` defaults to the current UTC time. A naive supplied datetime is treated as UTC; an aware datetime is converted to UTC.

`insufficient_history` is true when the total check-in count or number of non-null pain scores is below `pain_trend_min_check_ins`. The reason reports the required and received number of pain scores. Warning-sign rules can still emit alerts when history is insufficient for pain-trend analysis.

## 4. Doctor summary service

Source: `backend/services/summary_service.py`

```python
generate_doctor_summary(
    discharge_data: dict | None,
    check_ins: list[dict] | None,
    alert_result: dict | None,
) -> dict
```

### Inputs

- `discharge_data` is the AI service output, optionally extended with `patient_id`. The summary reads `medications`, `recovery_instructions`, `warning_signs`, `follow_up`, and `missing_information`. A missing medication item field is normalized to `"Not specified"`. Missing discharge data is allowed.
- `check_ins` uses the alert-engine fields and ascending unique `YYYY-MM-DD` dates. Only `date`, `pain_score`, and `symptoms` are accepted. Missing history is allowed.
- `alert_result` is the alert-engine result. It may be absent. Each supplied alert must be an object containing string `explanation` and list `supporting_check_ins`; other alert fields are passed through unchanged.
- If both discharge and alert result provide a patient ID, they must match. The summary gets its ID from discharge data first, otherwise from the alert result.
- Invalid structures raise `SummaryInputError`.

### Output

```json
{
  "patient_id": "string or null",
  "overview": "concise deterministic text",
  "discharge": {
    "recovery_instructions": ["string"],
    "medications": [
      {"name": "string", "dose": "string", "frequency": "string", "duration": "string"}
    ],
    "warning_signs": ["string"],
    "follow_up": "string or null"
  },
  "latest_check_in": {
    "date": "YYYY-MM-DD",
    "pain_score": "number or null",
    "symptoms": ["string"],
    "missing_fields": ["pain_score or symptoms"]
  },
  "trends": {
    "pain": {
      "direction": "increased, decreased, or unchanged",
      "change": "number",
      "evidence": [{"date": "YYYY-MM-DD", "pain_score": "number"}]
    },
    "symptoms": [
      {"symptom": "string", "check_in_count": "integer", "dates": ["YYYY-MM-DD"]}
    ]
  },
  "active_alerts": [],
  "missing_information": ["string"]
}
```

`latest_check_in` is `null` when there are no check-ins. Within it, `missing_fields` includes `pain_score` when the latest score is absent/null and `symptoms` when the latest symptom list is empty. `trends.pain` is `null` until at least two check-ins have pain scores; otherwise its evidence includes all recorded pain scores. Symptom trends list exact symptom texts with counts and dates. `active_alerts` preserves the alert objects supplied by the alert engine, including their supporting evidence. Missing discharge fields, check-in history, latest pain, and absent/empty alert results are reported in `missing_information`.

## Integration notes for Person 2

1. **PDF upload:** Pass uploaded bytes to `extract_text_from_pdf`, then pass its returned text to `interpret_discharge_summary`. Persist the validated interpretation and associate it with the application’s patient record. Handle `PDFExtractionError` and `AIServiceError` at the API boundary.
2. **Check-ins and alerts:** Store check-ins, then map records to only `date`, `pain_score`, and `symptoms` in chronological order before calling `analyze_check_ins(patient_id, check_ins, config)`. Configure thresholds and warning-sign rules for the intended care pathway. Persist/upsert returned alerts using `alert_id`; the service has no database access.
3. **Doctor summary:** Pass the stored discharge interpretation, the same mapped chronological check-in history, and the corresponding full alert-engine result to `generate_doctor_summary`. Do not attach database-only fields to check-in dictionaries without mapping them first.
4. **Groq environment:** The AI service expects `GROQ_API_KEY` and `GROQ_MODEL` in `backend/.env` or the process environment. The expected model for this project is `openai/gpt-oss-120b`. At the time this document was written, `backend/.env.example` still sets `GROQ_MODEL=llama-3.3-70b-versatile`; update that example separately if it should match the expected model. Keep the real API key out of source control and API responses.

All four services are function-level components; the current `backend/main.py` and routes do not yet provide the upload, check-in, persistence, or summary endpoints described above.
