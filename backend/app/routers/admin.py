from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.options import DropdownOption
from app.models.site_report import SiteReport, SiteReportStatus as SRS
from app.models.employee import Employee
from app.schemas import AdminStats
from app.routers.auth import admin_required

router = APIRouter()


@router.get("/stats", response_model=AdminStats)
async def get_stats(db: AsyncSession = Depends(get_db), _: dict = Depends(admin_required)):
    panels = await db.execute(select(func.coalesce(func.sum(SiteReport.installation_quantity), 0)))

    total_sr = await db.execute(select(func.count(SiteReport.id)))
    completed_sr = await db.execute(
        select(func.count(SiteReport.id)).where(SiteReport.status == SRS.COMPLETED.value)
    )
    pending_sr = await db.execute(
        select(func.count(SiteReport.id)).where(SiteReport.status.in_([
            SRS.DRAFT.value, SRS.READY_FOR_SIGNATURE.value, SRS.PENDING_SIGNATURES.value
        ]))
    )
    review_sr = await db.execute(
        select(func.count(SiteReport.id)).where(SiteReport.status == SRS.NEEDS_REVIEW.value)
    )

    sr_addrs = await db.execute(select(func.distinct(SiteReport.work_address)))
    all_addrs = set(a[0] for a in sr_addrs.all())

    employees = await db.execute(select(func.count(Employee.id)).where(Employee.is_active == True))

    return AdminStats(
        total_reports=total_sr.scalar_one(),
        completed_reports=completed_sr.scalar_one(),
        pending_reports=pending_sr.scalar_one(),
        anomaly_reports=review_sr.scalar_one(),
        total_panels_installed=panels.scalar_one(),
        active_projects=len(all_addrs),
    )



