from pydantic import BaseModel
from datetime import date, datetime
from uuid import UUID
from typing import Optional
from datetime import time


class SiteReportWorkerCreate(BaseModel):
    employee_id: UUID
    employee_name: str
    is_crew_lead: bool = False


class SiteReportWorkerResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: str
    is_crew_lead: bool

    class Config:
        from_attributes = True


class SiteReportCreate(BaseModel):
    work_date: date
    work_address: str
    employer: str = "FIREFLY SOLAR"
    crew_lead_id: Optional[UUID] = None
    installation_quantity: int = 0
    workers: list[SiteReportWorkerCreate] = []


class SiteReportUpdate(BaseModel):
    work_date: Optional[date] = None
    work_address: Optional[str] = None
    employer: Optional[str] = None
    crew_lead_id: Optional[UUID] = None
    installation_quantity: Optional[int] = None
    status: Optional[str] = None
    summary: Optional[str] = None


class SiteReportResponse(BaseModel):
    id: UUID
    work_date: date
    work_address: str
    employer: str
    crew_lead_id: Optional[UUID] = None
    installation_quantity: int
    status: str
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    workers: list[SiteReportWorkerResponse] = []
    milestones: list['MilestoneResponse'] = []

    class Config:
        from_attributes = True


class UpdateWorkersRequest(BaseModel):
    worker_ids: list[UUID]
    crew_lead_id: UUID


class SiteReportListItem(BaseModel):
    id: UUID
    work_date: date
    work_address: str
    crew_lead_name: Optional[str] = None
    installation_quantity: int
    status: str
    signature_progress: Optional[str] = None  # "3/6"
    created_at: datetime

    class Config:
        from_attributes = True


class MilestoneCreate(BaseModel):
    milestone_type: str
    estimated_completion_time: time
    actual_completion_time: time
    completed_as_expected: bool
    delay_reason: Optional[str] = None
    delay_other_reason: Optional[str] = None


class MilestoneResponse(BaseModel):
    id: UUID
    site_report_id: UUID
    milestone_type: str
    estimated_completion_time: time
    actual_completion_time: time
    completed_as_expected: bool
    delay_reason: Optional[str] = None
    delay_other_reason: Optional[str] = None

    class Config:
        from_attributes = True
