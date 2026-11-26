import json
import importlib
import os
import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import BACKEND_DIR, Base, DATABASE_URL, engine, get_db
from models import (
    Alert,
    CarePlan,
    CheckIn,
    CompanionObservation,
    CompanionRun,
    Doctor,
    Patient,
    ProposedTask,
)
from routes.agent import router as agent_router
from routes.auth import router as auth_router
from routes.careplans import router as careplans_router
from routes.alerts import router as alerts_router
from routes.checkins import router as checkins_router
from routes.patients import router as patients_router
from services.companion_agent import (
    CompanionEvidenceError,
    retrieve_recovery_context,
    run_recovery_companion,
)
from services.doctor_auth import create_access_token, hash_password


class BackendIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.auth_env = patch.dict(os.environ, {
            "JWT_SECRET_KEY": "synthetic-test-jwt-secret-value-at-least-32-bytes",
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES": "30",
            "DEMO_DOCTOR_EMAIL": "doctor@example.test",
            "DEMO_DOCTOR_PASSWORD": "synthetic-demo-password",
        })
        self.auth_env.start()
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
        app.include_router(auth_router)
        app.include_router(agent_router)

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
        self.auth_env.stop()

    def _create_patient(self):
        with self.session_factory() as db:
            patient = Patient(name="Synthetic Patient")
            db.add(patient)
            db.commit()
            db.refresh(patient)
            return patient.id

    def _create_care_plan(self, patient_id, plan_data):
        with self.session_factory() as db:
            plan = CarePlan(
                patient_id=patient_id,
                plan_data=json.dumps(plan_data, ensure_ascii=False),
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
            return plan.id

    def test_legacy_plan_initializes_adherence_without_changing_instructions(self):
        patient_id = self._create_patient()
        original_instruction = "  Original wording stays exactly as written.  "
        care_plan_id = self._create_care_plan(
            patient_id,
            {
                "patient_id": str(patient_id),
                "recovery_instructions": [original_instruction],
                "warning_signs": ["Existing warning sign"],
                "custom_field": {"keep": True},
            },
        )

        first = self.client.get(
            f"/api/patients/{patient_id}/careplan/latest/adherence"
        )
        second = self.client.get(
            f"/api/patients/{patient_id}/careplan/latest/adherence"
        )
        latest_plan = self.client.get(
            f"/api/patients/{patient_id}/careplan/latest"
        )

        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(latest_plan.status_code, 200, latest_plan.text)
        payload = first.json()
        self.assertEqual(payload["care_plan_id"], care_plan_id)
        self.assertEqual(latest_plan.json()["care_plan_id"], care_plan_id)
        self.assertEqual(payload["adherence"]["schema_version"], 1)
        self.assertEqual(payload["adherence"]["items"], [{
            "item_id": "instruction_0",
            "source_index": 0,
            "instruction": original_instruction,
            "status": "unreported",
            "reported_at": None,
            "patient_note": None,
        }])
        self.assertEqual(len(second.json()["adherence"]["items"]), 1)

        with self.session_factory() as db:
            stored = db.query(CarePlan).filter(CarePlan.id == care_plan_id).one()
            plan_data = json.loads(stored.plan_data)
        self.assertEqual(plan_data["recovery_instructions"], [original_instruction])
        self.assertEqual(plan_data["warning_signs"], ["Existing warning sign"])
        self.assertEqual(plan_data["custom_field"], {"keep": True})
        self.assertEqual(plan_data["adherence"], payload["adherence"])

    def test_adherence_status_update_persists_and_returns_original_instruction(self):
        patient_id = self._create_patient()
        instruction = "Keep the original line; do not paraphrase."
        care_plan_id = self._create_care_plan(
            patient_id, {"recovery_instructions": [instruction]}
        )

        for status in ("completed", "not_completed", "need_help", "not_applicable"):
            note = f"Patient note for {status}"
            response = self.client.patch(
                f"/api/patients/{patient_id}/careplan/{care_plan_id}/adherence/instruction_0",
                json={"status": status, "patient_note": note},
            )
            self.assertEqual(response.status_code, 200, response.text)
            item = response.json()["adherence"]["items"][0]
            self.assertEqual(item["instruction"], instruction)
            self.assertEqual(item["status"], status)
            self.assertIsNotNone(item["reported_at"])
            self.assertEqual(item["patient_note"], note)

            retrieved = self.client.get(
                f"/api/patients/{patient_id}/careplan/latest/adherence"
            )
            self.assertEqual(retrieved.status_code, 200, retrieved.text)
            self.assertEqual(retrieved.json()["adherence"]["items"][0], item)
            self.assertEqual(
                retrieved.json()["structured_plan"]["recovery_instructions"],
                [instruction],
            )

    def test_adherence_rejects_invalid_status_and_instruction_id(self):
        patient_id = self._create_patient()
        care_plan_id = self._create_care_plan(
            patient_id, {"recovery_instructions": ["Original instruction"]}
        )
        path = f"/api/patients/{patient_id}/careplan/{care_plan_id}/adherence"

        invalid_status = self.client.patch(
            f"{path}/instruction_0",
            json={"status": "missed"},
        )
        invalid_item = self.client.patch(
            f"{path}/instruction_99",
            json={"status": "completed"},
        )
        self.assertEqual(invalid_status.status_code, 422, invalid_status.text)
        self.assertEqual(invalid_item.status_code, 404, invalid_item.text)

    def test_adherence_update_cannot_access_another_patients_care_plan(self):
        owner_id = self._create_patient()
        other_patient_id = self._create_patient()
        care_plan_id = self._create_care_plan(
            owner_id, {"recovery_instructions": ["Owner instruction"]}
        )

        response = self.client.patch(
            f"/api/patients/{other_patient_id}/careplan/{care_plan_id}/adherence/instruction_0",
            json={"status": "completed"},
        )
        self.assertEqual(response.status_code, 404, response.text)
        with self.session_factory() as db:
            stored = db.query(CarePlan).filter(CarePlan.id == care_plan_id).one()
            self.assertNotIn("adherence", json.loads(stored.plan_data))

    def test_main_app_registers_adherence_patch_route(self):
        backend_dir = Path(__file__).resolve().parents[1]
        main_spec = importlib.util.spec_from_file_location(
            "recare_integration_main_route_test", backend_dir / "main.py"
        )
        app_module = importlib.util.module_from_spec(main_spec)
        sys.path.insert(0, str(backend_dir))
        try:
            with patch("database.initialize_database"):
                main_spec.loader.exec_module(app_module)
        finally:
            sys.path.remove(str(backend_dir))
        application = app_module.app
        registered_paths = application.openapi()["paths"]
        adherence_path = (
            "/api/patients/{patient_id}/careplan/{care_plan_id}/adherence/{item_id}"
        )
        self.assertIn(adherence_path, registered_paths)
        self.assertIn("patch", registered_paths[adherence_path])

    def test_main_app_registers_doctor_login_and_protected_agent_routes(self):
        backend_dir = Path(__file__).resolve().parents[1]
        main_spec = importlib.util.spec_from_file_location(
            "recare_integration_main_agent_route_test", backend_dir / "main.py"
        )
        app_module = importlib.util.module_from_spec(main_spec)
        sys.path.insert(0, str(backend_dir))
        try:
            with patch("database.initialize_database"):
                main_spec.loader.exec_module(app_module)
        finally:
            sys.path.remove(str(backend_dir))
        paths = app_module.app.openapi()["paths"]
        self.assertIn("/api/auth/doctor/login", paths)
        self.assertIn("post", paths["/api/auth/doctor/login"])
        expected = {
            "/api/patients/{patient_id}/agent/run": {"post"},
            "/api/patients/{patient_id}/agent/observations": {"get"},
            "/api/patients/{patient_id}/agent/tasks": {"get"},
            "/api/patients/{patient_id}/agent/tasks/{task_id}/approve": {"post"},
            "/api/patients/{patient_id}/agent/tasks/{task_id}/reject": {"post"},
        }
        for path, methods in expected.items():
            self.assertIn(path, paths)
            self.assertTrue(methods.issubset(paths[path]))

    def test_unknown_patient_patch_returns_endpoint_404_not_route_404(self):
        response = self.client.patch(
            "/api/patients/999999/careplan/999999/adherence/instruction_0",
            json={"status": "completed"},
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Patient not found"})

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

    def test_checkin_requires_pain_and_preserves_original_notes_through_history_and_summary(self):
        patient_id = self._create_patient()

        missing_pain = self.client.post(
            "/api/checkins",
            json={
                "patient_id": patient_id,
                "symptoms": [],
                "notes": "Original report",
            },
        )
        self.assertEqual(missing_pain.status_code, 422, missing_pain.text)

        original_report = "  Original wording, punctuation!\nKeep this line exactly.  "
        response = self.client.post(
            "/api/checkins",
            json={
                "patient_id": patient_id,
                "pain_level": 6,
                "symptoms": [],
                "notes": original_report,
                "date": "2026-11-25",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["notes"], original_report)
        self.assertEqual(response.json()["symptoms"], [])

        history = self.client.get(f"/api/patients/{patient_id}/history")
        self.assertEqual(history.status_code, 200, history.text)
        self.assertEqual(history.json()["history"][0]["notes"], original_report)
        self.assertEqual(history.json()["history"][0]["pain_level"], 6)

        summary = self.client.get(f"/api/patients/{patient_id}/summary")
        self.assertEqual(summary.status_code, 200, summary.text)
        self.assertEqual(summary.json()["latest_check_in"]["notes"], original_report)
        self.assertEqual(summary.json()["latest_check_in"]["pain_score"], 6)

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
        self.assertIsNone(payload["latest_check_in"]["notes"])
        self.assertFalse(payload["latest_check_in"]["medication_taken"])
        self.assertEqual(len(payload["active_alerts"]), 1)
        self.assertEqual(payload["discharge"]["recovery_instructions"], ["Rest as instructed."])

        care_plan_response = self.client.get(f"/api/careplan/{care_plan_id}")
        self.assertEqual(care_plan_response.status_code, 200, care_plan_response.text)
        self.assertEqual(
            care_plan_response.json()["structured_plan"]["follow_up"],
            "Follow up next week.",
        )

    def test_companion_context_retrieves_plan_adherence_checkins_and_alerts(self):
        patient_id = self._create_patient()
        care_plan_id = self._create_care_plan(
            patient_id,
            {
                "recovery_instructions": ["Rest as directed."],
                "adherence": {
                    "schema_version": 1,
                    "items": [{
                        "item_id": "instruction_0",
                        "source_index": 0,
                        "instruction": "Rest as directed.",
                        "status": "need_help",
                        "reported_at": "2026-11-25T10:00:00+00:00",
                        "patient_note": "I need help with this.",
                    }],
                },
            },
        )
        with self.session_factory() as db:
            checkin = CheckIn(
                patient_id=patient_id,
                pain_level=6,
                symptoms='["fatigue"]',
                notes="Original patient report.",
                created_at=datetime(2026, 11, 25),
            )
            db.add(checkin)
            db.flush()
            alert = Alert(
                patient_id=patient_id,
                severity="review_required",
                message="Existing alert evidence.",
                rule_triggered="configured_symptom:fatigue",
                supporting_check_ins='[{"date":"2026-11-25","symptom":"fatigue"}]',
                status="active",
            )
            db.add(alert)
            db.commit()

            context = retrieve_recovery_context(db, patient_id)

        ids = {record["evidence_id"] for record in context["evidence"]}
        self.assertIn(f"care_plan:{care_plan_id}", ids)
        self.assertIn(f"adherence:{care_plan_id}:instruction_0", ids)
        self.assertIn(f"checkin:{checkin.id}", ids)
        self.assertIn(f"alert:{alert.id}", ids)
        adherence = next(
            item for item in context["evidence"]
            if item["evidence_id"] == f"adherence:{care_plan_id}:instruction_0"
        )
        self.assertEqual(adherence["status"], "need_help")
        self.assertEqual(adherence["patient_note"], "I need help with this.")

    def test_companion_run_validates_evidence_persists_and_is_idempotent(self):
        patient_id = self._create_patient()
        care_plan_id = self._create_care_plan(
            patient_id,
            {"recovery_instructions": ["Use the documented recovery plan."]},
        )
        with self.session_factory() as db:
            checkin = CheckIn(
                patient_id=patient_id,
                pain_level=4,
                symptoms="[]",
                notes="Patient reports feeling steady.",
                created_at=datetime(2026, 11, 25),
            )
            db.add(checkin)
            db.commit()
            checkin_id = checkin.id

        response = {
            "observations": [{
                "title": "Check-in recorded",
                "description": "The patient reported pain level 4 in the recorded check-in.",
                "evidence_refs": [f"checkin:{checkin_id}"],
            }],
            "proposed_tasks": [
                {
                    "title": f"Review documented report {index}",
                    "description": "Doctor review of the cited patient record.",
                    "reason": "The cited record is available for clinician review.",
                    "evidence_refs": [f"checkin:{checkin_id}"],
                }
                for index in range(5)
            ],
        }
        with patch(
            "services.companion_agent.generate_recovery_companion_reasoning",
            return_value=response,
        ) as groq:
            with self.session_factory() as db:
                first = run_recovery_companion(db, patient_id)
            with self.session_factory() as db:
                second = run_recovery_companion(db, patient_id)

        self.assertFalse(first["reused_existing_run"])
        self.assertTrue(second["reused_existing_run"])
        self.assertEqual(first["run_id"], second["run_id"])
        self.assertEqual(len(first["proposed_tasks"]), 3)
        self.assertEqual(groq.call_count, 1)
        self.assertTrue(all(task["status"] == "pending" for task in first["proposed_tasks"]))
        self.assertTrue(all(
            set(task["evidence_refs"]).issubset({item["evidence_id"] for item in first["evidence"]})
            for task in first["proposed_tasks"]
        ))
        with self.session_factory() as db:
            self.assertEqual(db.query(CompanionRun).count(), 1)
            self.assertEqual(db.query(CompanionObservation).count(), 1)
            self.assertEqual(db.query(ProposedTask).count(), 3)
            stored_plan = db.query(CarePlan).filter(CarePlan.id == care_plan_id).one()
            self.assertEqual(
                json.loads(stored_plan.plan_data)["recovery_instructions"],
                ["Use the documented recovery plan."],
            )

    def test_companion_rejects_model_evidence_reference_outside_patient_records(self):
        patient_id = self._create_patient()
        self._create_care_plan(patient_id, {"recovery_instructions": []})
        invalid_response = {
            "observations": [{
                "title": "Unsupported",
                "description": "This cites a nonexistent patient record.",
                "evidence_refs": ["checkin:999999"],
            }],
            "proposed_tasks": [],
        }
        with patch(
            "services.companion_agent.generate_recovery_companion_reasoning",
            return_value=invalid_response,
        ):
            with self.session_factory() as db:
                with self.assertRaises(CompanionEvidenceError):
                    run_recovery_companion(db, patient_id)
                self.assertEqual(db.query(CompanionRun).count(), 0)
                self.assertEqual(db.query(ProposedTask).count(), 0)

    def test_doctor_login_valid_credentials_and_password_hash_storage(self):
        response = self.client.post(
            "/api/auth/doctor/login",
            json={"email": "doctor@example.test", "password": "synthetic-demo-password"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["token_type"], "bearer")
        self.assertTrue(payload["access_token"])
        self.assertGreater(payload["expires_in"], 0)
        with self.session_factory() as db:
            doctor = db.query(Doctor).one()
            self.assertTrue(doctor.password_hash.startswith("pbkdf2_sha256$"))
            self.assertNotEqual(doctor.password_hash, "synthetic-demo-password")

    def test_doctor_login_rejects_invalid_credentials(self):
        response = self.client.post(
            "/api/auth/doctor/login",
            json={"email": "doctor@example.test", "password": "wrong-password"},
        )
        self.assertEqual(response.status_code, 401, response.text)
        self.assertEqual(response.json(), {"detail": "Invalid email or password"})

    def test_doctor_login_uses_existing_hashed_account_without_demo_seed_env(self):
        with self.session_factory() as db:
            db.add(Doctor(
                email="stored-doctor@example.test",
                password_hash=hash_password("synthetic-stored-password"),
                role="doctor",
            ))
            db.commit()
        with patch.dict(os.environ, {
            "DEMO_DOCTOR_EMAIL": "",
            "DEMO_DOCTOR_PASSWORD": "",
        }):
            response = self.client.post(
                "/api/auth/doctor/login",
                json={
                    "email": "stored-doctor@example.test",
                    "password": "synthetic-stored-password",
                },
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["access_token"])

    def test_database_url_is_loaded_and_anchored_to_backend_directory(self):
        self.assertTrue(DATABASE_URL.startswith("sqlite:///"))
        self.assertEqual(
            Path(engine.url.database).resolve(),
            (BACKEND_DIR / "recare.db").resolve(),
        )

    def test_doctor_only_endpoints_reject_missing_and_invalid_tokens(self):
        missing = self.client.get("/api/patients/1/agent/observations")
        invalid = self.client.get(
            "/api/patients/1/agent/tasks",
            headers={"Authorization": "Bearer not-a-valid-jwt"},
        )
        self.assertEqual(missing.status_code, 401, missing.text)
        self.assertEqual(invalid.status_code, 401, invalid.text)

    def test_doctor_only_endpoint_rejects_non_doctor_role(self):
        token, _ = create_access_token("doctor@example.test", "patient")
        response = self.client.get(
            "/api/patients/1/agent/tasks",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_authorized_doctor_can_run_agent_read_records_and_review_owned_tasks(self):
        patient_id = self._create_patient()
        self._create_care_plan(patient_id, {"recovery_instructions": ["Rest as directed."]})
        with self.session_factory() as db:
            checkin = CheckIn(
                patient_id=patient_id,
                pain_level=3,
                symptoms="[]",
                notes="Synthetic patient report.",
                created_at=datetime(2026, 11, 25),
            )
            db.add(checkin)
            db.commit()
            checkin_id = checkin.id
        login = self.client.post(
            "/api/auth/doctor/login",
            json={"email": "doctor@example.test", "password": "synthetic-demo-password"},
        )
        self.assertEqual(login.status_code, 200, login.text)
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        reasoning = {
            "observations": [{
                "title": "Check-in available",
                "description": "A synthetic patient check-in was recorded.",
                "evidence_refs": [f"checkin:{checkin_id}"],
            }],
            "proposed_tasks": [{
                "title": "Review the check-in",
                "description": "Review the cited record.",
                "reason": "The check-in is available for doctor review.",
                "evidence_refs": [f"checkin:{checkin_id}"],
            }, {
                "title": "Review another record",
                "description": "Review the cited record.",
                "reason": "The check-in is available for doctor review.",
                "evidence_refs": [f"checkin:{checkin_id}"],
            }],
        }
        with patch(
            "services.companion_agent.generate_recovery_companion_reasoning",
            return_value=reasoning,
        ):
            run = self.client.post(
                f"/api/patients/{patient_id}/agent/run",
                headers=headers,
            )
        self.assertEqual(run.status_code, 200, run.text)
        run_payload = run.json()
        self.assertEqual(len(run_payload["proposed_tasks"]), 2)
        self.assertTrue(run_payload["observations"][0]["evidence_refs"])

        observations = self.client.get(
            f"/api/patients/{patient_id}/agent/observations", headers=headers
        )
        tasks = self.client.get(f"/api/patients/{patient_id}/agent/tasks", headers=headers)
        self.assertEqual(observations.status_code, 200, observations.text)
        self.assertEqual(tasks.status_code, 200, tasks.text)
        task_ids = [item["id"] for item in tasks.json()]
        approved = self.client.post(
            f"/api/patients/{patient_id}/agent/tasks/{task_ids[0]}/approve",
            headers=headers,
            json={"review_note": "Synthetic doctor review."},
        )
        rejected = self.client.post(
            f"/api/patients/{patient_id}/agent/tasks/{task_ids[1]}/reject",
            headers=headers,
            json={},
        )
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["status"], "approved")
        self.assertEqual(approved.json()["reviewed_by"], "doctor@example.test")
        self.assertEqual(approved.json()["review_note"], "Synthetic doctor review.")
        self.assertEqual(rejected.status_code, 200, rejected.text)
        self.assertEqual(rejected.json()["status"], "rejected")

        other_patient = self._create_patient()
        cross_patient = self.client.post(
            f"/api/patients/{other_patient}/agent/tasks/{task_ids[0]}/approve",
            headers=headers,
            json={},
        )
        self.assertEqual(cross_patient.status_code, 404, cross_patient.text)


if __name__ == "__main__":
    unittest.main()
