import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON

from app.database import Base


class FallProtectionPlan(Base):
    __tablename__ = "fall_protection_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("site_reports.id"), nullable=False, unique=True)

    employer_name: Mapped[str] = mapped_column(String(200), default="FIREFLY SOLAR")
    fall_hazards: Mapped[str | None] = mapped_column(Text, nullable=True)
    fall_protection_system: Mapped[str | None] = mapped_column(Text, nullable=True)
    anchor_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    anchor_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    system_procedures: Mapped[str | None] = mapped_column(Text, nullable=True)

    rescue_self: Mapped[bool] = mapped_column(Boolean, default=False)
    rescue_assisted_roof: Mapped[bool] = mapped_column(Boolean, default=False)
    rescue_ladder: Mapped[bool] = mapped_column(Boolean, default=False)
    rescue_awp: Mapped[bool] = mapped_column(Boolean, default=False)
    rescue_fire_dept: Mapped[bool] = mapped_column(Boolean, default=False)

    clearance_a: Mapped[float | None] = mapped_column(Float, nullable=True)
    clearance_b: Mapped[float | None] = mapped_column(Float, nullable=True)
    clearance_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    clearance_d: Mapped[float | None] = mapped_column(Float, nullable=True)
    clearance_e: Mapped[float | None] = mapped_column(Float, nullable=True)
    clearance_f_total: Mapped[float | None] = mapped_column(Float, nullable=True)

    worker_signatures: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    site_report: Mapped["SiteReport"] = relationship(back_populates="fall_protection_plan")


class HazardAssessment(Base):
    __tablename__ = "hazard_assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("site_reports.id"), nullable=False, unique=True)

    all_hazards_reviewed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    hazard_items: Mapped[list | None] = mapped_column(JSON, nullable=True)
    worker_signatures: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    site_report: Mapped["SiteReport"] = relationship(back_populates="hazard_assessment")
