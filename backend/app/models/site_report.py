import uuid
import enum
from datetime import date, datetime, time
from sqlalchemy import String, Integer, Float, Boolean, Date, Time, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class SiteReportStatus(str, enum.Enum):
    DRAFT = "draft"
    READY_FOR_SIGNATURE = "ready_for_signature"
    PENDING_SIGNATURES = "pending_signatures"
    COMPLETED = "completed"
    NEEDS_REVIEW = "needs_review"


class SiteReport(Base):
    __tablename__ = "site_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    work_address: Mapped[str] = mapped_column(String(500), nullable=False)
    employer: Mapped[str] = mapped_column(String(200), default="FIREFLY SOLAR")
    crew_lead_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    installation_quantity: Mapped[int] = mapped_column(Integer, default=0)
    site_contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    firefly_contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=SiteReportStatus.DRAFT.value)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workers: Mapped[list["SiteReportWorker"]] = relationship(back_populates="site_report", cascade="all, delete-orphan")
    videos: Mapped[list["VideoFile"]] = relationship(back_populates="site_report", cascade="all, delete-orphan")
    audio_files: Mapped[list["AudioFile"]] = relationship(back_populates="site_report", cascade="all, delete-orphan")
    signatures: Mapped[list["Signature"]] = relationship(back_populates="site_report", cascade="all, delete-orphan")
    fall_protection_plan: Mapped["FallProtectionPlan | None"] = relationship(back_populates="site_report", uselist=False, cascade="all, delete-orphan")
    hazard_assessment: Mapped["HazardAssessment | None"] = relationship(back_populates="site_report", uselist=False, cascade="all, delete-orphan")
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="site_report", cascade="all, delete-orphan")
    voice_recordings: Mapped[list["VoiceRecording"]] = relationship(back_populates="site_report", cascade="all, delete-orphan")


class SiteReportWorker(Base):
    __tablename__ = "site_report_workers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("site_reports.id"), nullable=False)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_crew_lead: Mapped[bool] = mapped_column(Boolean, default=False)
    clock_in_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    clock_out_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    site_report: Mapped["SiteReport"] = relationship(back_populates="workers")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("site_reports.id"), nullable=False)
    milestone_type: Mapped[str] = mapped_column(String(50), nullable=False)
    estimated_completion_time: Mapped[time] = mapped_column(Time, nullable=False)
    actual_completion_time: Mapped[time] = mapped_column(Time, nullable=False)
    completed_as_expected: Mapped[bool] = mapped_column(Boolean, nullable=False)
    delay_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    delay_other_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    site_report: Mapped["SiteReport"] = relationship(back_populates="milestones")


class VoiceRecording(Base):
    __tablename__ = "voice_recordings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_report_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("site_reports.id"), nullable=True)
    field_id: Mapped[str] = mapped_column(String(100), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), default="audio/webm")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    site_report: Mapped["SiteReport | None"] = relationship(back_populates="voice_recordings")
    transcript: Mapped["VoiceTranscript | None"] = relationship(back_populates="recording", uselist=False, cascade="all, delete-orphan")

    @property
    def transcript_raw(self) -> str | None:
        return self.transcript.raw_text if self.transcript else None

    @property
    def transcript_processed(self) -> str | None:
        return self.transcript.processed_text if self.transcript else None


class VoiceTranscript(Base):
    __tablename__ = "voice_transcripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recording_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("voice_recordings.id"), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    processed_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recording: Mapped["VoiceRecording"] = relationship(back_populates="transcript")
