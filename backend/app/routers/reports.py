from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Report, AttendanceRecord, Milestone, VoiceRecording, ReportStatus
from app.schemas import ReportCreate, ReportResponse, ReportListItem
from app.services.telegram_bot import send_report_to_telegram

router = APIRouter()


@router.post("/", response_model=ReportResponse)
async def create_report(data: ReportCreate, db: AsyncSession = Depends(get_db)):
    report = Report(
        work_date=data.work_date,
        work_address=data.work_address,
        crew_leader_name=data.crew_leader_name,
        panels_installed_today=data.panels_installed_today,
        daily_plan_completed=data.daily_plan_completed,
        daily_plan_incomplete_reason=data.daily_plan_incomplete_reason,
        daily_plan_incomplete_other_reason=data.daily_plan_incomplete_other_reason,
        status=ReportStatus.COMPLETED.value,
    )

    for att in data.attendance_records:
        report.attendance_records.append(AttendanceRecord(
            employee_name=att.employee_name,
            arrival_time=att.arrival_time,
            departure_time=att.departure_time,
        ))

    for ms in data.milestones:
        report.milestones.append(Milestone(
            milestone_type=ms.milestone_type,
            estimated_completion_time=ms.estimated_completion_time,
            actual_completion_time=ms.actual_completion_time,
            completed_as_expected=ms.completed_as_expected,
            delay_reason=ms.delay_reason,
            delay_other_reason=ms.delay_other_reason,
        ))

    db.add(report)
    await db.flush()

    if data.voice_recording_ids:
        for rec_id in data.voice_recording_ids:
            result = await db.execute(select(VoiceRecording).where(VoiceRecording.id == rec_id))
            recording = result.scalar_one_or_none()
            if recording:
                recording.report_id = report.id

    await db.commit()

    result = await db.execute(
        select(Report)
        .options(selectinload(Report.attendance_records), selectinload(Report.milestones))
        .where(Report.id == report.id)
    )
    report = result.scalar_one()

    await send_report_to_telegram(report)

    return report


@router.get("/", response_model=list[ReportListItem])
async def list_reports(
    crew_leader: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Report).order_by(Report.created_at.desc())
    if crew_leader:
        query = query.where(Report.crew_leader_name == crew_leader)
    if status:
        query = query.where(Report.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.attendance_records),
            selectinload(Report.milestones),
            selectinload(Report.voice_recordings).selectinload(VoiceRecording.transcript),
        )
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
