
from pydantic import BaseModel, Field
from typing import Optional, List


class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None


class CheckInCreate(BaseModel):
    patient_id: int
    pain_level: Optional[int] = Field(default=None, ge=0, le=10)
    pain_score: Optional[int] = Field(default=None, ge=0, le=10)
    temperature: Optional[str] = None
    temperature_c: Optional[float] = None
    medication_taken: Optional[bool] = None
    reported_symptoms: Optional[str] = None
    symptoms: List[str] = Field(default_factory=list)
    mood: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[str] = None


class CheckInResponse(BaseModel):
    id: int
    patient_id: int
    pain_level: int
    temperature: Optional[str] = None
    symptoms: Optional[str] = None
    mood: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True
