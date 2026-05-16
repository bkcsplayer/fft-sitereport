from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class SignatureCreate(BaseModel):
    site_report_id: UUID
    worker_id: UUID
    worker_name: str
    document_type: str  # fall_protection_plan | hazard_assessment
    signature_image_base64: str
    confirmation_text: str = "I have reviewed and understood this document."


class SignatureResponse(BaseModel):
    id: UUID
    site_report_id: UUID
    worker_id: UUID
    worker_name: str
    document_type: str
    signature_image_path: Optional[str] = None
    confirmation_text: str
    status: str
    signed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SignatureMatrixRow(BaseModel):
    worker_id: UUID
    worker_name: str
    is_crew_lead: bool
    fall_protection_plan: Optional[SignatureResponse] = None
    hazard_assessment: Optional[SignatureResponse] = None


class SignatureProgressResponse(BaseModel):
    total_required: int
    completed: int
    status: str
    matrix: list[SignatureMatrixRow] = []


class DocumentSnapshotResponse(BaseModel):
    id: UUID
    site_report_id: UUID
    signature_id: UUID
    document_type: str
    worker_id: UUID
    html_content: str
    created_at: datetime

    class Config:
        from_attributes = True
