import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.site_report import SiteReport
from app.models.signature import Signature, DocumentSnapshot
from app.routers.signatures import _generate_snapshot_pdf

router = APIRouter()


@router.post("/{report_id}/{worker_id}/{document_type}")
async def generate_snapshot(
    report_id: uuid.UUID,
    worker_id: uuid.UUID,
    document_type: str,
    db: AsyncSession = Depends(get_db),
):
    """Regenerate HTML snapshot for a signed document."""
    if document_type not in ("fall_protection_plan", "hazard_assessment"):
        raise HTTPException(status_code=400, detail="Invalid document_type")

    sr_result = await db.execute(
        select(SiteReport)
        .options(
            selectinload(SiteReport.workers),
            selectinload(SiteReport.fall_protection_plan),
            selectinload(SiteReport.hazard_assessment),
        )
        .where(SiteReport.id == report_id)
    )
    sr = sr_result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    sig_result = await db.execute(
        select(Signature).where(
            Signature.site_report_id == report_id,
            Signature.worker_id == worker_id,
            Signature.document_type == document_type,
            Signature.status == "signed",
        )
    )
    sig = sig_result.scalar_one_or_none()
    if not sig:
        raise HTTPException(status_code=404, detail="Signature not found")

    worker = next((w for w in sr.workers if w.employee_id == worker_id), None)
    worker_name = worker.employee_name if worker else sig.worker_name

    pdf_path = _generate_snapshot_pdf(sr, sig, worker_name, document_type)

    # Upsert snapshot
    existing = await db.execute(
        select(DocumentSnapshot).where(DocumentSnapshot.signature_id == sig.id)
    )
    snap = existing.scalar_one_or_none()

    if snap:
        snap.file_path = pdf_path
    else:
        snap = DocumentSnapshot(
            site_report_id=report_id,
            signature_id=sig.id,
            document_type=document_type,
            worker_id=worker_id,
            file_path=pdf_path,
        )
        db.add(snap)

    await db.commit()
    await db.refresh(snap)
    return {"snapshot_id": str(snap.id)}


@router.get("/{snapshot_id}", response_class=FileResponse)
async def view_snapshot(snapshot_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DocumentSnapshot).where(DocumentSnapshot.id == snapshot_id)
    )
    snap = result.scalar_one_or_none()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return FileResponse(path=snap.file_path, media_type="application/pdf", filename=f"document_{snapshot_id}.pdf")


@router.get("/by-signature/{signature_id}", response_class=FileResponse)
async def view_snapshot_by_signature(signature_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DocumentSnapshot).where(DocumentSnapshot.signature_id == signature_id)
    )
    snap = result.scalar_one_or_none()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found for this signature")
    return FileResponse(path=snap.file_path, media_type="application/pdf", filename=f"document_sig_{signature_id}.pdf")
