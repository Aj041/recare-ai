
from fastapi import APIRouter, Depends
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

    return {
        "total_alerts": len(alerts),
        "alerts": [
            {
                "id": alert.id,
                "patient_id": alert.patient_id,
                "severity": alert.severity,
                "message": alert.message,
                "status": alert.status,
                "created_at": alert.created_at
            }
            for alert in alerts
        ]
    }
