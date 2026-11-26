
from datetime import datetime
from typing import Any, Literal, Optional, List

from pydantic import BaseModel, ConfigDict, Field, model_validator


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


class DoctorLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


class JWTAccessTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class CheckInCreate(BaseModel):
    patient_id: int
    pain_level: int = Field(..., ge=0, le=10)
    pain_score: Optional[int] = Field(default=None, ge=0, le=10)
    temperature: Optional[str] = None
    temperature_c: Optional[float] = None
    medication_taken: Optional[bool] = None
    reported_symptoms: Optional[str] = None
    symptoms: List[str] = Field(default_factory=list)
    mood: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_pain_score(cls, values):
        """Keep the existing pain_score request alias while requiring a value."""
        if isinstance(values, dict) and values.get("pain_level") is None:
            legacy_score = values.get("pain_score")
            if legacy_score is not None:
                values = {**values, "pain_level": legacy_score}
        return values


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


AdherenceStatus = Literal[
    "unreported", "completed", "not_completed", "need_help", "not_applicable"
]


class AdherenceUpdateRequest(BaseModel):
    status: AdherenceStatus
    patient_note: Optional[str] = None


class AdherenceItemResponse(BaseModel):
    item_id: str
    source_index: int
    instruction: str
    status: AdherenceStatus
    reported_at: Optional[datetime] = None
    patient_note: Optional[str] = None


class AdherenceStateResponse(BaseModel):
    schema_version: Literal[1]
    items: list[AdherenceItemResponse]


class CarePlanAdherenceResponse(BaseModel):
    care_plan_id: int
    patient_id: int
    structured_plan: dict[str, Any]
    adherence: AdherenceStateResponse
    created_at: datetime


class CompanionObservationOutput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    evidence_refs: list[str] = Field(min_length=1)


class CompanionTaskOutput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    evidence_refs: list[str] = Field(min_length=1)


class CompanionReasoningOutput(BaseModel):
    observations: list[CompanionObservationOutput]
    proposed_tasks: list[CompanionTaskOutput]


class CompanionTaskReviewRequest(BaseModel):
    review_note: Optional[str] = None


class CompanionObservationResponse(BaseModel):
    id: int
    title: str
    description: str
    evidence_refs: list[str]
    source: Literal["agent_generated", "system_generated"]
    created_at: datetime


class ProposedTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    reason: str
    evidence_refs: list[str]
    status: Literal["pending", "approved", "rejected"]
    created_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None


class CompanionRunResponse(BaseModel):
    run_id: int
    patient_id: int
    evidence_hash: str
    created_at: datetime
    reused_existing_run: bool
    deterministic_alerts: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    observations: list[CompanionObservationResponse]
    proposed_tasks: list[ProposedTaskResponse]


class MedicationDetailsResponse(BaseModel):
    medication_id: str
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str


class MedicationHistoryResponse(BaseModel):
    id: int
    care_plan_id: int
    medication_id: str
    medication_name: str
    previous_details: MedicationDetailsResponse
    updated_details: MedicationDetailsResponse
    reason: str
    doctor_email: str
    created_at: datetime


class MedicationListResponse(BaseModel):
    care_plan_id: int
    patient_id: int
    medications: list[MedicationDetailsResponse]
    history: list[MedicationHistoryResponse]


class MedicationCurrentResponse(BaseModel):
    care_plan_id: int
    patient_id: int
    medications: list[MedicationDetailsResponse]


class MedicationUpdateRequest(BaseModel):
    dosage: str = Field(min_length=1, max_length=200)
    frequency: str = Field(min_length=1, max_length=200)
    duration: str = Field(min_length=1, max_length=200)
    instructions: str = Field(min_length=1, max_length=2000)
    reason: str = Field(min_length=1, max_length=2000)
    confirmed: Literal[True]
