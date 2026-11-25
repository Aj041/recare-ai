import json

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session

from database import get_db
from models import Patient, CarePlan
from services.pdf_service import extract_text_from_pdf, PDFExtractionError
from services.ai_service import interpret_discharge_summary, AIServiceError

router = APIRouter(
    prefix="/api/discharge",
    tags=["Discharge"]
)


@router.post("/upload")
async def upload_discharge_pdf(
    patient_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        pdf_bytes = await file.read()

        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Uploaded PDF is empty")

        # Person 3: extract text from the PDF.
        extracted_text = extract_text_from_pdf(pdf_bytes)

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in the PDF"
            )

        # Person 3: interpret the extracted discharge summary using Groq.
        interpretation = interpret_discharge_summary(extracted_text)

        # Store the extracted text and interpreted fields together.
        plan_data = {
            "patient_id": str(patient_id),
            "extracted_text": extracted_text,
            **interpretation
        }

        new_care_plan = CarePlan(
            patient_id=patient_id,
            plan_data=json.dumps(plan_data, ensure_ascii=False)
        )

        db.add(new_care_plan)
        db.commit()
        db.refresh(new_care_plan)

        return {
            "message": "Discharge PDF extracted, interpreted and saved successfully",
            "care_plan_id": new_care_plan.id,
            "patient_id": patient_id,
            "patient_name": patient.name,
            "extracted_text": extracted_text,
            "interpretation": interpretation
        }

    except HTTPException:
        db.rollback()
        raise

    except PDFExtractionError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    except AIServiceError as exc:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail=f"Discharge interpretation failed: {str(exc)}"
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to process and save discharge PDF"
        )