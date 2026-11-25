
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import CarePlan

router = APIRouter(
    prefix="/api/careplan",
    tags=["Care Plans"]
)


@router.get("/{careplan_id}")
def get_careplan(
    careplan_id: int,
    db: Session = Depends(get_db)
):
    careplan = db.query(CarePlan).filter(
        CarePlan.id == careplan_id
    ).first()

    if not careplan:
        raise HTTPException(
            status_code=404,
            detail="Care plan not found"
        )

    try:
        structured_plan = json.loads(careplan.plan_data)
    except (TypeError, json.JSONDecodeError):
        structured_plan = None

    return {
        "care_plan_id": careplan.id,
        "patient_id": careplan.patient_id,
        "plan_data": careplan.plan_data,
        "structured_plan": structured_plan,
        "created_at": careplan.created_at
    }
