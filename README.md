# RE:CARE AI

AI-powered post-discharge patient monitoring and early intervention system.

## Run the backend

From `backend`, install the dependencies and start FastAPI:

```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload
```

Set `GROQ_API_KEY` in `backend\.env` before uploading a discharge PDF. The
backend does not return a successful interpretation when the key is missing.
Interactive API documentation is available at `http://localhost:8000/docs`.

## Main API routes

- `GET /api/patients/` and `POST /api/patients/`
- `POST /api/discharge/upload` (multipart `patient_id` and PDF `file`)
- `GET /api/careplan/{careplan_id}`
- `POST /api/checkins` and `GET /api/patients/{patient_id}/history`
- `GET /api/alerts/?patient_id={patient_id}`
- `GET /api/patients/{patient_id}/summary`

Check-in requests keep the existing `pain_level` field and also accept
`pain_score`; `temperature`, `symptoms`, `mood`, and `notes` remain supported.
Optional `reported_symptoms`, `temperature_c`, and `medication_taken` fields
are persisted and returned in history and summaries. `patient_id` remains the
integer ID returned by the patient API.
