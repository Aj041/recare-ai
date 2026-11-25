
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Alert

router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"]
)


@router.get("/")
def get_alerts(
    patient_id: int = None,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)

    # Optionally filter alerts by patient
    if patient_id is not None:
        query = query.filter(
            Alert.patient_id == patient_id
        )

    alerts = query.order_by(
        Alert.created_at.desc()
    ).all()

    serialized_alerts = []
    for alert in alerts:
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

        serialized_alerts.append(
            {
                "id": alert.id,
                "patient_id": alert.patient_id,
                "severity": alert.severity,
                "message": alert.message,
                "rule_triggered": alert.rule_triggered,
                "supporting_check_ins": supporting_check_ins,
                "status": alert.status,
                "created_at": alert.created_at,
            }
        )

    return {
        "total_alerts": len(serialized_alerts),
        "alerts": serialized_alerts,
    }
