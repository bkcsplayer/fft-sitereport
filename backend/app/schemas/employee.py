from pydantic import BaseModel
from datetime import date, datetime
from uuid import UUID
from typing import Optional


class CertificateCreate(BaseModel):
    certificate_type: str
    certificate_number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class CertificateResponse(BaseModel):
    id: UUID
    employee_id: UUID
    certificate_type: str
    certificate_number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    image_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeCreate(BaseModel):
    name: str
    role: str = "worker"  # "worker" or "crew_lead"
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None  # "worker" or "crew_lead"
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    username: Optional[str] = None
    password: Optional[str] = None


class EmployeeResponse(BaseModel):
    id: UUID
    name: str
    role: str = "worker"  # "worker" or "crew_lead"
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    username: Optional[str] = None
    created_at: datetime
    certificates: list[CertificateResponse] = []

    class Config:
        from_attributes = True


class EmployeeListItem(BaseModel):
    id: UUID
    name: str
    role: str = "worker"  # "worker" or "crew_lead"
    is_active: bool
    username: Optional[str] = None
    certificate_count: int = 0

    class Config:
        from_attributes = True
