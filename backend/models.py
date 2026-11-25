
from sqlalchemy import Boolean, Column, Float, Integer, String, Text, DateTime, ForeignKey
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
