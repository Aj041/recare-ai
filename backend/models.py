
from sqlalchemy import Boolean, Column, Float, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


# 1. Patients table
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer)
    gender = Column(String(20))
    phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)

    care_plans = relationship("CarePlan", back_populates="patient")
    checkins = relationship("CheckIn", back_populates="patient")
    alerts = relationship("Alert", back_populates="patient")


class Doctor(Base):
    """Hackathon doctor account; only a password hash is persisted."""
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(254), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="doctor")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# 2. Care plans table
class CarePlan(Base):
    __tablename__ = "care_plans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    plan_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="care_plans")


# 3. Check-ins table
class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    pain_level = Column(Integer, nullable=False)
    temperature = Column(String(20))
    temperature_c = Column(Float)
    medication_taken = Column(Boolean)
    reported_symptoms = Column(Text)
    symptoms = Column(Text)
    mood = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="checkins")


# 4. Alerts table
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    severity = Column(String(30))
    message = Column(Text)
    rule_triggered = Column(String(100))
    supporting_check_ins = Column(Text)
    status = Column(String(30), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="alerts")


class CompanionRun(Base):
    __tablename__ = "companion_runs"
    __table_args__ = (
        UniqueConstraint("patient_id", "evidence_hash", name="uq_companion_run_evidence"),
    )

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    evidence_hash = Column(String(64), nullable=False)
    model = Column(String(100), nullable=False)
    evidence_snapshot = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CompanionObservation(Base):
    __tablename__ = "companion_observations"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("companion_runs.id"), nullable=False, index=True)
    source_type = Column(String(30), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    evidence_refs = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ProposedTask(Base):
    __tablename__ = "proposed_tasks"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("companion_runs.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    evidence_refs = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(String(120))
    reviewed_at = Column(DateTime)
    review_note = Column(Text)


class MedicationHistory(Base):
    """Append-only record of a doctor-authorized medication detail update."""
    __tablename__ = "medication_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    care_plan_id = Column(Integer, ForeignKey("care_plans.id"), nullable=False, index=True)
    medication_id = Column(String(100), nullable=False, index=True)
    medication_name = Column(String(200), nullable=False)
    previous_details = Column(Text, nullable=False)
    updated_details = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    doctor_email = Column(String(254), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
