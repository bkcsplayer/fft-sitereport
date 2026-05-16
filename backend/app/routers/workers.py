import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.employee import Employee
from app.models.site_report import SiteReport, SiteReportWorker, SiteReportStatus
from app.models.signature import Signature
from app.models.safety import FallProtectionPlan, HazardAssessment
from app.routers.auth import get_token_session

router = APIRouter()


def _get_employee_id_from_session(session: dict) -> str:
    eid = session.get("employee_id")
    if not eid:
        raise HTTPException(status_code=401, detail="Worker login required")
    return eid


@router.get("/dashboard")
async def worker_dashboard(
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    employee_id = _get_employee_id_from_session(session)

    # Find all site reports this worker is assigned to and are ready/pending for signatures
    result = await db.execute(
        select(SiteReportWorker).where(
            SiteReportWorker.employee_id == employee_id,
        ).order_by(SiteReportWorker.site_report_id.desc())
    )
    assignments = result.scalars().all()

    pending = []
    for sw in assignments:
        sr_result = await db.execute(select(SiteReport).where(SiteReport.id == sw.site_report_id))
        sr = sr_result.scalar_one_or_none()
        if not sr:
            continue

        # Only show reports that crew lead has confirmed (ready_for_signature or beyond)
        if sr.status == SiteReportStatus.DRAFT.value:
            continue

        sigs_result = await db.execute(
            select(Signature).where(
                Signature.site_report_id == sw.site_report_id,
                Signature.worker_id == employee_id,
            )
        )
        sigs = sigs_result.scalars().all()

        fpp_sig = next((s for s in sigs if s.document_type == "fall_protection_plan"), None)
        ha_sig = next((s for s in sigs if s.document_type == "hazard_assessment"), None)

        pending.append({
            "site_report_id": str(sr.id),
            "work_date": str(sr.work_date),
            "work_address": sr.work_address,
            "status": sr.status,
            "is_crew_lead": sw.is_crew_lead,
            "clock_in_time": sw.clock_in_time.isoformat() if sw.clock_in_time else None,
            "clock_out_time": sw.clock_out_time.isoformat() if sw.clock_out_time else None,
            "fpp_status": fpp_sig.status if fpp_sig else "unsigned",
            "ha_status": ha_sig.status if ha_sig else "unsigned",
        })

    return {"worker_id": employee_id, "assignments": pending}


@router.post("/clock-in")
async def clock_in(
    site_report_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    employee_id = _get_employee_id_from_session(session)

    result = await db.execute(
        select(SiteReportWorker).where(
            SiteReportWorker.site_report_id == site_report_id,
            SiteReportWorker.employee_id == employee_id,
        )
    )
    sw = result.scalar_one_or_none()
    if not sw:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if sw.clock_in_time:
        return {"status": "already_clocked_in", "time": sw.clock_in_time.isoformat()}

    sw.clock_in_time = datetime.utcnow()
    await db.commit()
    return {"status": "ok", "time": sw.clock_in_time.isoformat()}


@router.post("/clock-out")
async def clock_out(
    site_report_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    employee_id = _get_employee_id_from_session(session)

    result = await db.execute(
        select(SiteReportWorker).where(
            SiteReportWorker.site_report_id == site_report_id,
            SiteReportWorker.employee_id == employee_id,
        )
    )
    sw = result.scalar_one_or_none()
    if not sw:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if not sw.clock_in_time:
        raise HTTPException(status_code=400, detail="Must clock in before clocking out")

    sw.clock_out_time = datetime.utcnow()
    await db.commit()
    return {"status": "ok", "time": sw.clock_out_time.isoformat()}


@router.get("/site-report/{report_id}/documents")
async def get_signing_documents(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    employee_id = _get_employee_id_from_session(session)

    result = await db.execute(
        select(SiteReportWorker).where(
            SiteReportWorker.site_report_id == report_id,
            SiteReportWorker.employee_id == employee_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Not assigned to this report")

    sr_result = await db.execute(
        select(SiteReport).options(selectinload(SiteReport.workers)).where(SiteReport.id == report_id)
    )
    sr = sr_result.scalar_one_or_none()

    # Only allow viewing if crew lead has confirmed (status beyond draft)
    if not sr or sr.status == SiteReportStatus.DRAFT.value:
        raise HTTPException(status_code=404, detail="Documents not yet available for signing")

    crew_leader = next((w.employee_name for w in (sr.workers or []) if w.is_crew_lead), "—") if sr else "—"

    fpp_result = await db.execute(
        select(FallProtectionPlan).where(FallProtectionPlan.site_report_id == report_id)
    )
    fpp = fpp_result.scalar_one_or_none()

    ha_result = await db.execute(
        select(HazardAssessment).where(HazardAssessment.site_report_id == report_id)
    )
    ha = ha_result.scalar_one_or_none()

    sigs_result = await db.execute(
        select(Signature).where(
            Signature.site_report_id == report_id,
            Signature.worker_id == employee_id,
            Signature.status == "signed",
        )
    )
    sigs = sigs_result.scalars().all()
    signed_types = {s.document_type for s in sigs}
    already_signed = "fall_protection_plan" in signed_types and "hazard_assessment" in signed_types

    return {
        "info": {
            "report_id": str(report_id),
            "work_date": str(sr.work_date) if sr else "",
            "work_address": sr.work_address if sr else "",
            "crew_leader": crew_leader,
        } if sr else None,
        "fpp": {
            "employer_name": fpp.employer_name,
            "fall_hazards": fpp.fall_hazards,
            "fall_protection_system": fpp.fall_protection_system,
            "anchor_type": fpp.anchor_type,
            "anchor_count": fpp.anchor_count,
            "system_procedures": fpp.system_procedures,
            "rescue_self": fpp.rescue_self or False,
            "rescue_assisted_roof": fpp.rescue_assisted_roof or False,
            "rescue_ladder": fpp.rescue_ladder or False,
            "rescue_awp": fpp.rescue_awp or False,
            "rescue_fire_dept": fpp.rescue_fire_dept or False,
            "clearance_a": fpp.clearance_a,
            "clearance_b": fpp.clearance_b,
            "clearance_c": fpp.clearance_c,
            "clearance_d": fpp.clearance_d,
            "clearance_e": fpp.clearance_e,
            "clearance_f_total": fpp.clearance_f_total,
        } if fpp else None,
        "ha": {
            "all_hazards_reviewed": ha.all_hazards_reviewed,
            "hazard_items": ha.hazard_items,
        } if ha else None,
        "already_signed": already_signed,
        "fpp_signed": "fall_protection_plan" in signed_types,
        "ha_signed": "hazard_assessment" in signed_types,
    }
