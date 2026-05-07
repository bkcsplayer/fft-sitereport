import uuid
from datetime import date, time, datetime
from sqlalchemy import String, Integer, Float, Boolean, Text, Date, Time, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

import enum


class ReportStatus(str, enum.Enum):
    DRAFT = "draft"
    COMPLETED = "completed"
    ANOMALY = "anomaly"


class OptionCategory(str, enum.Enum):
    PROJECT_LIST = "project_list"
    CREW_LEADER_LIST = "crew_leader_list"
    EMPLOYEE_LIST = "employee_list"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    work_address: Mapped[str] = mapped_column(String(500), nullable=False)
    crew_leader_name: Mapped[str] = mapped_column(String(100), nullable=False)
    panels_installed_today: Mapped[int] = mapped_column(Integer, default=0)

    daily_plan_completed: Mapped[bool] = mapped_column(Boolean, nullable=True)
    daily_plan_incomplete_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    daily_plan_incomplete_other_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default=ReportStatus.DRAFT.value)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(back_populates="report", cascade="all, delete-orphan")
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="report", cascade="all, delete-orphan")
    voice_recordings: Mapped[list["VoiceRecording"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(100), nullable=False)
    arrival_time: Mapped[time] = mapped_column(Time, nullable=False)
    departure_time: Mapped[time] = mapped_column(Time, nullable=False)

    report: Mapped["Report"] = relationship(back_populates="attendance_records")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    milestone_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "rough_in" or "final_installation"
    estimated_completion_time: Mapped[time] = mapped_column(Time, nullable=False)
    actual_completion_time: Mapped[time] = mapped_column(Time, nullable=False)
    completed_as_expected: Mapped[bool] = mapped_column(Boolean, nullable=False)
    delay_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    delay_other_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    report: Mapped["Report"] = relationship(back_populates="milestones")


class VoiceRecording(Base):
    __tablename__ = "voice_recordings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True)
    field_id: Mapped[str] = mapped_column(String(100), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), default="audio/webm")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    report: Mapped["Report | None"] = relationship(back_populates="voice_recordings")
    transcript: Mapped["VoiceTranscript | None"] = relationship(back_populates="recording", uselist=False, cascade="all, delete-orphan")


class VoiceTranscript(Base):
    __tablename__ = "voice_transcripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recording_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("voice_recordings.id"), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    processed_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recording: Mapped["VoiceRecording"] = relationship(back_populates="transcript")


class DropdownOption(Base):
    __tablename__ = "dropdown_options"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[str] = mapped_column(String(300), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
