from pydantic import BaseModel
from datetime import date, time, datetime
from uuid import UUID
from typing import Optional


class AttendanceRecordCreate(BaseModel):
    employee_name: str
    arrival_time: time
    departure_time: time


class AttendanceRecordResponse(BaseModel):
    id: UUID
    employee_name: str
    arrival_time: time
    departure_time: time

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
    milestone_type: str
    estimated_completion_time: time
    actual_completion_time: time
    completed_as_expected: bool
    delay_reason: Optional[str] = None
    delay_other_reason: Optional[str] = None

    class Config:
        from_attributes = True


class VoiceRecordingResponse(BaseModel):
    id: UUID
    field_id: str
    file_path: str
    file_size: int
    duration_seconds: Optional[float] = None
    mime_type: str
    created_at: datetime
    transcript_raw: Optional[str] = None
    transcript_processed: Optional[str] = None

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    work_date: date
    work_address: str
    crew_leader_name: str
    panels_installed_today: int = 0
    daily_plan_completed: Optional[bool] = None
    daily_plan_incomplete_reason: Optional[str] = None
    daily_plan_incomplete_other_reason: Optional[str] = None
    attendance_records: list[AttendanceRecordCreate] = []
    milestones: list[MilestoneCreate] = []
    voice_recording_ids: list[UUID] = []


class ReportResponse(BaseModel):
    id: UUID
    work_date: date
    work_address: str
    crew_leader_name: str
    panels_installed_today: int
    daily_plan_completed: Optional[bool] = None
    daily_plan_incomplete_reason: Optional[str] = None
    daily_plan_incomplete_other_reason: Optional[str] = None
    status: str
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    attendance_records: list[AttendanceRecordResponse] = []
    milestones: list[MilestoneResponse] = []
    voice_recordings: list[VoiceRecordingResponse] = []

    class Config:
        from_attributes = True


class ReportListItem(BaseModel):
    id: UUID
    work_date: date
    work_address: str
    crew_leader_name: str
    panels_installed_today: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DropdownOptionCreate(BaseModel):
    category: str
    value: str
    sort_order: int = 0


class DropdownOptionResponse(BaseModel):
    id: UUID
    category: str
    value: str
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class VoiceTranscribeResponse(BaseModel):
    recording_id: UUID
    raw_text: str
    processed_text: Optional[str] = None


class AdminStats(BaseModel):
    total_reports: int
    completed_reports: int
    pending_reports: int
    anomaly_reports: int
    total_panels_installed: int
    active_projects: int
