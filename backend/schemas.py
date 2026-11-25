
from pydantic import BaseModel
from typing import Optional

from typing import List
from datetime import date

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
    pain_level: int
    temperature: Optional[str] = None
    symptoms: Optional[List[str]] = []
    mood: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[date] = None


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

    class Config:
        from_attributes = True
