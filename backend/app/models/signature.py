import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Signature(Base):
    __tablename__ = "signatures"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("site_reports.id"), nullable=False)
    worker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    worker_name: Mapped[str] = mapped_column(String(100), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # fall_protection_plan | hazard_assessment
    signature_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    confirmation_text: Mapped[str] = mapped_column(String(500), default="I have reviewed and understood this document.")
    status: Mapped[str] = mapped_column(String(20), default="not_signed")  # not_signed | signed
    signed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    site_report: Mapped["SiteReport"] = relationship(back_populates="signatures")
    snapshot: Mapped["DocumentSnapshot | None"] = relationship(back_populates="signature", uselist=False, cascade="all, delete-orphan")


class DocumentSnapshot(Base):
    __tablename__ = "document_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("site_reports.id"), nullable=False)
    signature_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("signatures.id"), nullable=False, unique=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    worker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    html_content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    signature: Mapped["Signature"] = relationship(back_populates="snapshot")
