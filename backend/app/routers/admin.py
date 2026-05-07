from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Report, ReportStatus
from app.schemas import AdminStats, ReportListItem

router = APIRouter()


@router.get("/stats", response_model=AdminStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total = await db.execute(select(func.count(Report.id)))
    completed = await db.execute(
        select(func.count(Report.id)).where(Report.status == ReportStatus.COMPLETED.value)
    )
    draft = await db.execute(
        select(func.count(Report.id)).where(Report.status == ReportStatus.DRAFT.value)
    )
    anomaly = await db.execute(
        select(func.count(Report.id)).where(Report.status == ReportStatus.ANOMALY.value)
    )
    panels = await db.execute(select(func.coalesce(func.sum(Report.panels_installed_today), 0)))
    projects = await db.execute(select(func.count(func.distinct(Report.work_address))))

    return AdminStats(
        total_reports=total.scalar_one(),
        completed_reports=completed.scalar_one(),
        pending_reports=draft.scalar_one(),
        anomaly_reports=anomaly.scalar_one(),
        total_panels_installed=panels.scalar_one(),
        active_projects=projects.scalar_one(),
    )


@router.get("/reports", response_model=list[ReportListItem])
async def admin_list_reports(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).order_by(Report.created_at.desc()).limit(limit).offset(offset)
    )
    return result.scalars().all()
