import uuid
import os
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.employee import Employee, Certificate
from app.models.site_report import SiteReport, SiteReportWorker, SiteReportStatus, Milestone
from app.models.signature import Signature, DocumentSnapshot
from app.models.safety import FallProtectionPlan, HazardAssessment
from app.models.media import VideoFile, AudioFile
from app.schemas.site_report import (
    SiteReportCreate, SiteReportUpdate, SiteReportResponse, SiteReportListItem,
    SiteReportWorkerResponse, UpdateWorkersRequest,
)
from app.schemas.safety import (
    FallProtectionPlanCreate, FallProtectionPlanResponse,
    HazardAssessmentCreate, HazardAssessmentResponse,
)
from app.schemas.signature import SignatureProgressResponse, SignatureMatrixRow
from app.schemas.site_report import MilestoneCreate, MilestoneResponse
from app.config import settings
from app.routers.auth import get_token_session, crew_lead_or_admin_required
from app.services import nas_service
from app.database import async_session

router = APIRouter()

async def _upload_to_nas_bg(file_id: uuid.UUID, file_type: str, local_path: str, nas_filename: str):
    try:
        nas_path = await nas_service.upload_video(local_path, nas_filename)
        async with async_session() as session:
            if file_type == "video":
                vf = await session.get(VideoFile, file_id)
                if vf:
                    vf.nas_path = nas_path
                    await session.commit()
            elif file_type == "audio":
                af = await session.get(AudioFile, file_id)
                if af:
                    af.nas_path = nas_path
                    await session.commit()
    except Exception as e:
        print(f"Background NAS upload failed for {file_type} {file_id}: {e}")


def _cert_status(expiry_date):
    if expiry_date is None:
        return "missing"
    today = date.today()
    if expiry_date < today:
        return "expired"
    if (expiry_date - today).days <= 30:
        return "expiring_soon"
    return "valid"


def _compute_status(sr: SiteReport) -> str:
    """Compute status based on signatures vs workers. Only handles post-DRAFT states."""
    workers = sr.workers
    if not workers:
        return sr.status
    sigs = sr.signatures or []
    total_needed = len(workers) * 2  # FPP + HA per worker
    signed_count = sum(1 for s in sigs if s.status == "signed")
    if signed_count >= total_needed and total_needed > 0:
        return SiteReportStatus.COMPLETED.value
    if signed_count > 0:
        return SiteReportStatus.PENDING_SIGNATURES.value
    return SiteReportStatus.READY_FOR_SIGNATURE.value


# ─── Site Report CRUD ────────────────────────────────────

@router.post("/", response_model=SiteReportResponse)
async def create_site_report(
    data: SiteReportCreate,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(crew_lead_or_admin_required),
):
    sr = SiteReport(
        work_date=data.work_date,
        work_address=data.work_address,
        employer=data.employer,
        crew_lead_id=data.crew_lead_id,
        installation_quantity=data.installation_quantity,
    )
    db.add(sr)
    await db.flush()

    for w in data.workers:
        sw = SiteReportWorker(
            site_report_id=sr.id,
            employee_id=w.employee_id,
            employee_name=w.employee_name,
            is_crew_lead=w.is_crew_lead,
        )
        db.add(sw)

    await db.commit()
    await db.refresh(sr)

    result = await db.execute(
        select(SiteReport)
        .options(
            selectinload(SiteReport.workers),
            selectinload(SiteReport.milestones)
        )
        .where(SiteReport.id == sr.id)
    )
    return result.scalar_one()


@router.get("/", response_model=list[SiteReportListItem])
async def list_site_reports(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    is_admin = session.get("role") == "admin"
    is_crew_lead = session.get("role") == "crew_lead"
    if not is_admin and not is_crew_lead:
        raise HTTPException(status_code=403, detail="Crew lead or admin access required")

    query = select(SiteReport).order_by(SiteReport.created_at.desc())
    if status:
        query = query.where(SiteReport.status == status)

    result = await db.execute(query)
    reports = result.scalars().all()

    items = []
    for sr in reports:
        workers_result = await db.execute(
            select(SiteReportWorker).where(SiteReportWorker.site_report_id == sr.id)
        )
        workers = workers_result.scalars().all()
        sigs_result = await db.execute(
            select(Signature).where(Signature.site_report_id == sr.id)
        )
        sigs = sigs_result.scalars().all()

        total_needed = len(workers) * 2
        signed_count = sum(1 for s in sigs if s.status == "signed")
        progress = f"{signed_count}/{total_needed}" if total_needed > 0 else None

        crew_lead = next((w.employee_name for w in workers if w.is_crew_lead), None)

        items.append(SiteReportListItem(
            id=sr.id,
            work_date=sr.work_date,
            work_address=sr.work_address,
            crew_lead_name=crew_lead,
            installation_quantity=sr.installation_quantity,
            status=sr.status,
            signature_progress=progress,
            created_at=sr.created_at,
        ))
    return items


@router.get("/{report_id}")
async def get_site_report_detail(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SiteReport)
        .options(
            selectinload(SiteReport.workers),
            selectinload(SiteReport.videos),
            selectinload(SiteReport.audio_files),
            selectinload(SiteReport.signatures).selectinload(Signature.snapshot),
            selectinload(SiteReport.fall_protection_plan),
            selectinload(SiteReport.hazard_assessment),
            selectinload(SiteReport.milestones),
        )
        .where(SiteReport.id == report_id)
    )
    sr = result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    sigs = sr.signatures or []
    matrix_rows = []
    for w in sr.workers:
        fpp_sig = next((s for s in sigs if s.worker_id == w.employee_id and s.document_type == "fall_protection_plan"), None)
        ha_sig = next((s for s in sigs if s.worker_id == w.employee_id and s.document_type == "hazard_assessment"), None)
        matrix_rows.append(SignatureMatrixRow(
            worker_id=w.employee_id,
            worker_name=w.employee_name,
            is_crew_lead=w.is_crew_lead,
            fall_protection_plan=fpp_sig,
            hazard_assessment=ha_sig,
        ))

    total_needed = len(sr.workers) * 2
    signed_count = sum(1 for s in sigs if s.status == "signed")

    # Only auto-compute status if we're beyond DRAFT
    if sr.status != SiteReportStatus.DRAFT.value:
        current_status = _compute_status(sr)
        if current_status != sr.status:
            sr.status = current_status
            await db.commit()

    return {
        "id": str(sr.id),
        "work_date": str(sr.work_date),
        "work_address": sr.work_address,
        "employer": sr.employer,
        "crew_lead_id": str(sr.crew_lead_id) if sr.crew_lead_id else None,
        "installation_quantity": sr.installation_quantity,
        "site_contact": sr.site_contact,
        "firefly_contact": sr.firefly_contact,
        "status": sr.status,
        "summary": sr.summary,
        "created_at": sr.created_at.isoformat(),
        "updated_at": sr.updated_at.isoformat(),
        "workers": [{
            "id": str(w.id),
            "employee_id": str(w.employee_id),
            "employee_name": w.employee_name,
            "is_crew_lead": w.is_crew_lead,
            "clock_in_time": w.clock_in_time.isoformat() if w.clock_in_time else None,
            "clock_out_time": w.clock_out_time.isoformat() if w.clock_out_time else None,
        } for w in sr.workers],
        "videos": [{
            "id": str(v.id),
            "file_name": v.file_name,
            "file_path": v.file_path,
            "mime_type": v.mime_type,
            "file_size": v.file_size,
            "created_at": v.created_at.isoformat(),
        } for v in (sr.videos or [])],
        "audio_files": [{
            "id": str(a.id),
            "file_name": a.file_name,
            "file_path": a.file_path,
            "mime_type": a.mime_type,
            "file_size": a.file_size,
            "duration_seconds": a.duration_seconds,
            "created_at": a.created_at.isoformat(),
        } for a in (sr.audio_files or [])],
        "fall_protection_plan": {
            "id": str(sr.fall_protection_plan.id),
            "employer_name": sr.fall_protection_plan.employer_name,
            "fall_hazards": sr.fall_protection_plan.fall_hazards,
            "fall_protection_system": sr.fall_protection_plan.fall_protection_system,
            "anchor_type": sr.fall_protection_plan.anchor_type,
            "anchor_count": sr.fall_protection_plan.anchor_count,
            "system_procedures": sr.fall_protection_plan.system_procedures,
            "rescue_self": sr.fall_protection_plan.rescue_self,
            "rescue_assisted_roof": sr.fall_protection_plan.rescue_assisted_roof,
            "rescue_ladder": sr.fall_protection_plan.rescue_ladder,
            "rescue_awp": sr.fall_protection_plan.rescue_awp,
            "rescue_fire_dept": sr.fall_protection_plan.rescue_fire_dept,
            "clearance_a": sr.fall_protection_plan.clearance_a,
            "clearance_b": sr.fall_protection_plan.clearance_b,
            "clearance_c": sr.fall_protection_plan.clearance_c,
            "clearance_d": sr.fall_protection_plan.clearance_d,
            "clearance_e": sr.fall_protection_plan.clearance_e,
            "clearance_f_total": sr.fall_protection_plan.clearance_f_total,
        } if sr.fall_protection_plan else None,
        "hazard_assessment": {
            "id": str(sr.hazard_assessment.id),
            "all_hazards_reviewed": sr.hazard_assessment.all_hazards_reviewed,
            "hazard_items": sr.hazard_assessment.hazard_items,
        } if sr.hazard_assessment else None,
        "signature_progress": {
            "total_required": total_needed,
            "completed": signed_count,
            "status": sr.status,
            "matrix": [r.model_dump(mode='json') for r in matrix_rows],
        },
        "milestones": [{
            "id": str(m.id),
            "site_report_id": str(m.site_report_id),
            "milestone_type": m.milestone_type,
            "estimated_completion_time": m.estimated_completion_time.isoformat(),
            "actual_completion_time": m.actual_completion_time.isoformat(),
            "completed_as_expected": m.completed_as_expected,
            "delay_reason": m.delay_reason,
            "delay_other_reason": m.delay_other_reason,
        } for m in (sr.milestones or [])],
    }


@router.patch("/{report_id}", response_model=SiteReportResponse)
async def update_site_report(
    report_id: uuid.UUID,
    data: SiteReportUpdate,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(crew_lead_or_admin_required),
):
    result = await db.execute(
        select(SiteReport)
        .options(
            selectinload(SiteReport.workers),
            selectinload(SiteReport.milestones)
        )
        .where(SiteReport.id == report_id)
    )
    sr = result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(sr, key, val)
    await db.commit()
    await db.refresh(sr)
    return sr


# ─── Crew Lead: Confirm FPP+HA → send to workers ─────────

@router.post("/{report_id}/confirm")
async def confirm_for_signing(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(crew_lead_or_admin_required),
):
    """Crew lead confirms FPP and HA are complete. Transitions DRAFT → READY_FOR_SIGNATURE."""
    result = await db.execute(
        select(SiteReport)
        .options(
            selectinload(SiteReport.workers),
            selectinload(SiteReport.fall_protection_plan),
            selectinload(SiteReport.hazard_assessment),
        )
        .where(SiteReport.id == report_id)
    )
    sr = result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    if sr.status != SiteReportStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail=f"Report is already in '{sr.status}' status")

    if not sr.workers:
        raise HTTPException(status_code=400, detail="Please assign at least one worker before confirming")

    if not sr.fall_protection_plan:
        raise HTTPException(status_code=400, detail="Please fill in the Fall Protection Plan before confirming")

    if not sr.hazard_assessment:
        raise HTTPException(status_code=400, detail="Please fill in the Hazard Assessment before confirming")

    sr.status = SiteReportStatus.READY_FOR_SIGNATURE.value
    await db.commit()

    # Compute initial signature progress
    sigs_result = await db.execute(
        select(Signature).where(Signature.site_report_id == report_id)
    )
    sigs = sigs_result.scalars().all()
    total_needed = len(sr.workers) * 2
    signed_count = sum(1 for s in sigs if s.status == "signed")

    matrix_rows = []
    for w in sr.workers:
        fpp_sig = next((s for s in sigs if s.worker_id == w.employee_id and s.document_type == "fall_protection_plan"), None)
        ha_sig = next((s for s in sigs if s.worker_id == w.employee_id and s.document_type == "hazard_assessment"), None)
        matrix_rows.append(SignatureMatrixRow(
            worker_id=w.employee_id,
            worker_name=w.employee_name,
            is_crew_lead=w.is_crew_lead,
            fall_protection_plan=fpp_sig,
            hazard_assessment=ha_sig,
        ))

    return {
        "status": "confirmed",
        "report_status": sr.status,
        "signature_progress": {
            "total_required": total_needed,
            "completed": signed_count,
            "status": sr.status,
            "matrix": [r.model_dump(mode='json') for r in matrix_rows],
        },
    }


# ─── Video Upload ────────────────────────────────────────

@router.post("/{report_id}/videos")
async def upload_site_video(
    report_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    result = await db.execute(select(SiteReport).where(SiteReport.id == report_id))
    sr = result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    video_dir = os.path.join(settings.AUDIO_STORAGE_PATH, "videos", str(report_id))
    os.makedirs(video_dir, exist_ok=True)

    ext = video.filename.split(".")[-1] if video.filename else "mp4"
    file_name = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(video_dir, file_name)

    content = await video.read()
    with open(file_path, "wb") as f:
        f.write(content)

    vf = VideoFile(
        site_report_id=report_id,
        file_name=video.filename or file_name,
        file_path=file_path,
        mime_type=video.content_type or "video/mp4",
        file_size=len(content),
    )
    db.add(vf)
    await db.commit()
    await db.refresh(vf)

    nas_filename = nas_service.generate_video_filename(sr.work_address, str(sr.work_date))
    background_tasks.add_task(_upload_to_nas_bg, vf.id, "video", file_path, nas_filename)

    return {
        "id": str(vf.id),
        "file_name": vf.file_name,
        "file_path": vf.file_path,
        "nas_path": vf.nas_path,
        "file_size": vf.file_size,
        "created_at": vf.created_at.isoformat(),
    }


@router.get("/{report_id}/videos/{video_id}")
async def get_site_video(
    report_id: uuid.UUID,
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VideoFile).where(
            VideoFile.id == video_id,
            VideoFile.site_report_id == report_id,
        )
    )
    vf = result.scalar_one_or_none()
    if not vf or not os.path.exists(vf.file_path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(vf.file_path, media_type=vf.mime_type)


# ─── Audio Upload ────────────────────────────────────────

@router.post("/{report_id}/audio")
async def upload_site_audio(
    report_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    duration: float = Form(None),
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    result = await db.execute(select(SiteReport).where(SiteReport.id == report_id))
    sr = result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    audio_dir = os.path.join(settings.AUDIO_STORAGE_PATH, "audio_notes", str(report_id))
    os.makedirs(audio_dir, exist_ok=True)

    ext = audio.filename.split(".")[-1] if audio.filename else "webm"
    file_name = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(audio_dir, file_name)

    content = await audio.read()
    with open(file_path, "wb") as f:
        f.write(content)

    af = AudioFile(
        site_report_id=report_id,
        file_name=audio.filename or file_name,
        file_path=file_path,
        mime_type=audio.content_type or "audio/webm",
        file_size=len(content),
        duration_seconds=duration,
    )
    db.add(af)
    await db.commit()
    await db.refresh(af)

    nas_filename = nas_service.generate_video_filename(f"Audio_{sr.work_address}", str(sr.work_date)).replace(".mp4", f".{ext}")
    background_tasks.add_task(_upload_to_nas_bg, af.id, "audio", file_path, nas_filename)

    return {
        "id": str(af.id),
        "file_name": af.file_name,
        "file_path": af.file_path,
        "nas_path": af.nas_path,
        "file_size": af.file_size,
        "duration_seconds": af.duration_seconds,
        "created_at": af.created_at.isoformat(),
    }


@router.get("/{report_id}/audio/{audio_id}")
async def get_site_audio(
    report_id: uuid.UUID,
    audio_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AudioFile).where(
            AudioFile.id == audio_id,
            AudioFile.site_report_id == report_id,
        )
    )
    af = result.scalar_one_or_none()
    if not af or not os.path.exists(af.file_path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(af.file_path, media_type=af.mime_type)


# ─── Fall Protection Plan ────────────────────────────────

@router.post("/{report_id}/fpp", response_model=FallProtectionPlanResponse)
async def save_fpp(
    report_id: uuid.UUID,
    data: FallProtectionPlanCreate,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(crew_lead_or_admin_required),
):
    result = await db.execute(select(SiteReport).where(SiteReport.id == report_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Site report not found")

    existing = await db.execute(
        select(FallProtectionPlan).where(FallProtectionPlan.site_report_id == report_id)
    )
    fpp = existing.scalar_one_or_none()

    if fpp:
        for key, val in data.model_dump(exclude_unset=True).items():
            setattr(fpp, key, val)
    else:
        fpp = FallProtectionPlan(site_report_id=report_id, **data.model_dump())
        db.add(fpp)

    await db.commit()
    await db.refresh(fpp)
    return fpp


@router.get("/{report_id}/fpp", response_model=FallProtectionPlanResponse)
async def get_fpp(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FallProtectionPlan).where(FallProtectionPlan.site_report_id == report_id)
    )
    fpp = result.scalar_one_or_none()
    if not fpp:
        raise HTTPException(status_code=404, detail="FPP not found")
    return fpp


# ─── Hazard Assessment ───────────────────────────────────

@router.post("/{report_id}/ha", response_model=HazardAssessmentResponse)
async def save_ha(
    report_id: uuid.UUID,
    data: HazardAssessmentCreate,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(crew_lead_or_admin_required),
):
    result = await db.execute(select(SiteReport).where(SiteReport.id == report_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Site report not found")

    existing = await db.execute(
        select(HazardAssessment).where(HazardAssessment.site_report_id == report_id)
    )
    ha = existing.scalar_one_or_none()

    if ha:
        for key, val in data.model_dump(exclude_unset=True).items():
            setattr(ha, key, val)
    else:
        ha = HazardAssessment(site_report_id=report_id, **data.model_dump())
        db.add(ha)

    await db.commit()
    await db.refresh(ha)
    return ha


@router.get("/{report_id}/ha", response_model=HazardAssessmentResponse)
async def get_ha(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(HazardAssessment).where(HazardAssessment.site_report_id == report_id)
    )
    ha = result.scalar_one_or_none()
    if not ha:
        raise HTTPException(status_code=404, detail="HA not found")
    return ha


# ─── Milestones ──────────────────────────────────────────

@router.post("/{report_id}/milestones", response_model=MilestoneResponse)
async def create_milestone(
    report_id: uuid.UUID,
    data: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(crew_lead_or_admin_required),
):
    result = await db.execute(select(SiteReport).where(SiteReport.id == report_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Site report not found")

    ms = Milestone(site_report_id=report_id, **data.model_dump())
    db.add(ms)
    await db.commit()
    await db.refresh(ms)
    return ms


@router.get("/{report_id}/milestones", response_model=list[MilestoneResponse])
async def get_milestones(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Milestone).where(Milestone.site_report_id == report_id).order_by(Milestone.created_at)
    )
    return result.scalars().all()


@router.delete("/{report_id}/milestones/{milestone_id}")
async def delete_milestone(
    report_id: uuid.UUID,
    milestone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(crew_lead_or_admin_required),
):
    result = await db.execute(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.site_report_id == report_id)
    )
    ms = result.scalar_one_or_none()
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    await db.delete(ms)
    await db.commit()
    return {"status": "ok"}


# ─── Workers ─────────────────────────────────────────────

@router.put("/{report_id}/workers")
async def update_workers(
    report_id: uuid.UUID,
    body: UpdateWorkersRequest,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(crew_lead_or_admin_required),
):
    result = await db.execute(select(SiteReport).where(SiteReport.id == report_id))
    sr = result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    existing = await db.execute(
        select(SiteReportWorker).where(SiteReportWorker.site_report_id == report_id)
    )
    for w in existing.scalars().all():
        await db.delete(w)

    for eid in body.worker_ids:
        emp_result = await db.execute(select(Employee).where(Employee.id == eid))
        emp = emp_result.scalar_one_or_none()
        if not emp:
            continue
        sw = SiteReportWorker(
            site_report_id=report_id,
            employee_id=eid,
            employee_name=emp.name,
            is_crew_lead=(eid == body.crew_lead_id),
        )
        db.add(sw)

    await db.commit()
    return {"status": "ok", "worker_count": len(body.worker_ids)}
