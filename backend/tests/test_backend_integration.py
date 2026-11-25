import json
import unittest
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from models import Alert, CarePlan, CheckIn, Patient
from routes.careplans import router as careplans_router
from routes.alerts import router as alerts_router
from routes.checkins import router as checkins_router
from routes.patients import router as patients_router


class BackendIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
        )

        app = FastAPI()
        app.include_router(patients_router)
        app.include_router(checkins_router)
        app.include_router(careplans_router)
        app.include_router(alerts_router)

        def override_get_db():
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def _create_patient(self):
        with self.session_factory() as db:
            patient = Patient(name="Synthetic Patient")
            db.add(patient)
            db.commit()
            db.refresh(patient)
            return patient.id

    def test_checkin_persists_contract_fields_and_uses_discharge_warning_signs(self):
        patient_id = self._create_patient()
        with self.session_factory() as db:
            db.add(
                CarePlan(
                    patient_id=patient_id,
                    plan_data=json.dumps(
                        {"warning_signs": ["shortness of breath"]}
                    ),
                )
            )
            db.commit()

        response = self.client.post(
            "/api/checkins",
            json={
                "patient_id": patient_id,
                "pain_score": 7,
                "reported_symptoms": "Breathing has become difficult.",
                "symptoms": ["shortness of breath"],
                "medication_taken": True,
                "temperature_c": 37.2,
                "date": "2026-11-25",
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["pain_level"], 7)
        self.assertEqual(payload["temperature_c"], 37.2)
        self.assertTrue(payload["medication_taken"])
        self.assertEqual(
            payload["generated_alerts"][0]["rule_triggered"],
            "configured_symptom:shortness of breath",
        )

        with self.session_factory() as db:
            checkin = db.query(CheckIn).one()
            alert = db.query(Alert).one()
            self.assertEqual(checkin.reported_symptoms, "Breathing has become difficult.")
            self.assertEqual(checkin.temperature_c, 37.2)
            self.assertTrue(checkin.medication_taken)
            self.assertEqual(alert.severity, "discharge_warning_sign")
            self.assertEqual(alert.rule_triggered, "configured_symptom:shortness of breath")

        alerts_response = self.client.get("/api/alerts/", params={"patient_id": patient_id})
        self.assertEqual(alerts_response.status_code, 200, alerts_response.text)
        self.assertEqual(
            alerts_response.json()["alerts"][0]["supporting_check_ins"],
            [{"date": "2026-11-25", "symptom": "shortness of breath"}],
        )

    def test_existing_checkin_request_fields_remain_supported(self):
        patient_id = self._create_patient()

        response = self.client.post(
            "/api/checkins",
            json={
                "patient_id": patient_id,
                "pain_level": 4,
                "temperature": "37 C",
                "symptoms": ["fatigue"],
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["pain_level"], 4)
        self.assertEqual(response.json()["temperature"], "37 C")
        self.assertEqual(response.json()["symptoms"], ["fatigue"])

    def test_patient_summary_uses_latest_daily_checkin_and_structured_plan(self):
        patient_id = self._create_patient()
        with self.session_factory() as db:
            plan = CarePlan(
                patient_id=patient_id,
                plan_data=json.dumps(
                    {
                        "patient_id": str(patient_id),
                        "medications": [],
                        "recovery_instructions": ["Rest as instructed."],
                        "warning_signs": [],
                        "follow_up": "Follow up next week.",
                        "missing_information": [],
                    }
                ),
            )
            db.add(plan)
            db.flush()
            db.add_all(
                [
                    CheckIn(
                        patient_id=patient_id,
                        pain_level=3,
                        symptoms="[]",
                        created_at=datetime(2026, 11, 24, 8),
                    ),
                    CheckIn(
                        patient_id=patient_id,
                        pain_level=5,
                        symptoms='["fatigue"]',
                        reported_symptoms="Feeling more tired today.",
                        medication_taken=False,
                        temperature_c=36.8,
                        created_at=datetime(2026, 11, 24, 16),
                    ),
                ]
            )
            db.add(
                Alert(
                    patient_id=patient_id,
                    severity="review_required",
                    message="Configured review alert.",
                    status="active",
                )
            )
            db.commit()
            care_plan_id = plan.id

        response = self.client.get(f"/api/patients/{patient_id}/summary")

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["latest_check_in"]["pain_score"], 5)
        self.assertEqual(
            payload["latest_check_in"]["reported_symptoms"],
            "Feeling more tired today.",
        )
        self.assertFalse(payload["latest_check_in"]["medication_taken"])
        self.assertEqual(len(payload["active_alerts"]), 1)
        self.assertEqual(payload["discharge"]["recovery_instructions"], ["Rest as instructed."])

        care_plan_response = self.client.get(f"/api/careplan/{care_plan_id}")
        self.assertEqual(care_plan_response.status_code, 200, care_plan_response.text)
        self.assertEqual(
            care_plan_response.json()["structured_plan"]["follow_up"],
            "Follow up next week.",
        )


if __name__ == "__main__":
    unittest.main()
