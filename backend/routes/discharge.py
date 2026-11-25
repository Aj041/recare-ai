
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session
import fitz

from database import get_db
from models import Patient, CarePlan

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
    # Check file extension
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    # Check whether patient exists
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    try:
        pdf_bytes = await file.read()

        # Open PDF
        document = fitz.open(
            stream=pdf_bytes,
            filetype="pdf"
        )

        # Extract text
        extracted_text = ""

        for page in document:
            extracted_text += page.get_text() + "\n"

        document.close()

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in PDF"
            )

        # Save extracted text in database
        new_care_plan = CarePlan(
            patient_id=patient_id,
            plan_data=extracted_text
        )

        db.add(new_care_plan)
        db.commit()
        db.refresh(new_care_plan)

        return {
            "message": "Discharge PDF processed and saved successfully",
            "care_plan_id": new_care_plan.id,
            "patient_id": patient_id,
            "patient_name": patient.name,
            "extracted_text": extracted_text
        }

    except HTTPException:
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to process and save discharge PDF"
        )
