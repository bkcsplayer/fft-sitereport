import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import bcrypt
import os

from app.database import get_db
from app.models.employee import Employee, Certificate
from app.models.site_report import SiteReport, SiteReportWorker
from app.models.signature import Signature, DocumentSnapshot
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeListItem,
    CertificateCreate, CertificateResponse,
)
from app.config import settings
from app.routers.auth import get_token_session, admin_required, get_token_from_request

router = APIRouter()


def _cert_status(expiry_date):
    if expiry_date is None:
        return "missing"
    from datetime import date
    today = date.today()
    if expiry_date < today:
        return "expired"
    if (expiry_date - today).days <= 30:
        return "expiring_soon"
    return "valid"


# ─── Employees ───────────────────────────────────────────

@router.get("/", response_model=list[EmployeeListItem])
async def list_employees(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    is_admin = session.get("role") == "admin"
    is_crew_lead = session.get("role") == "crew_lead"
    if not is_admin and not is_crew_lead:
        raise HTTPException(status_code=403, detail="Admin or crew lead access required")
    if include_inactive and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can view inactive employees")
    query = select(Employee)
    if not include_inactive:
        query = query.where(Employee.is_active == True)
    query = query.order_by(Employee.name)
    result = await db.execute(query)
    employees = result.scalars().all()

    items = []
    for emp in employees:
        cert_count_result = await db.execute(
            select(func.count(Certificate.id)).where(Certificate.employee_id == emp.id)
        )
        items.append(EmployeeListItem(
            id=emp.id,
            name=emp.name,
            role=emp.role,
            is_active=emp.is_active,
            username=emp.username,
            certificate_count=cert_count_result.scalar_one(),
        ))
    return items


@router.post("/", response_model=EmployeeResponse)
async def create_employee(data: EmployeeCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(admin_required)):
    emp_data = data.model_dump()
    password = emp_data.pop("password", None)
    if password:
        emp_data["password_hash"] = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    emp = Employee(**emp_data)
    db.add(emp)
    await db.commit()
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.certificates))
        .where(Employee.id == emp.id)
    )
    return result.scalar_one()


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    is_admin = session.get("role") == "admin"
    is_crew_lead = session.get("role") == "crew_lead"
    is_self = session.get("employee_id") == str(employee_id)
    if not is_admin and not is_self and not is_crew_lead:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.certificates))
        .where(Employee.id == employee_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(admin_required),
):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    update_data = data.model_dump(exclude_unset=True)
    password = update_data.pop("password", None)
    if password:
        update_data["password_hash"] = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    for key, val in update_data.items():
        setattr(emp, key, val)
    await db.commit()
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.certificates))
        .where(Employee.id == employee_id)
    )
    return result.scalar_one()


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(admin_required),
):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    certs = await db.execute(select(Certificate).where(Certificate.employee_id == employee_id))
    for cert in certs.scalars().all():
        if cert.image_path and os.path.exists(cert.image_path):
            os.remove(cert.image_path)
        await db.delete(cert)

    snaps = await db.execute(select(DocumentSnapshot).where(DocumentSnapshot.worker_id == employee_id))
    for snap in snaps.scalars().all():
        await db.delete(snap)

    sigs = await db.execute(select(Signature).where(Signature.worker_id == employee_id))
    for sig in sigs.scalars().all():
        await db.delete(sig)

    workers = await db.execute(select(SiteReportWorker).where(SiteReportWorker.employee_id == employee_id))
    for w in workers.scalars().all():
        await db.delete(w)

    reports = await db.execute(select(SiteReport).where(SiteReport.crew_lead_id == employee_id))
    for r in reports.scalars().all():
        r.crew_lead_id = None

    await db.delete(emp)
    await db.commit()
    return {"status": "deleted"}


# ─── Certificates ────────────────────────────────────────

@router.post("/{employee_id}/certificates", response_model=CertificateResponse)
async def add_certificate(
    employee_id: uuid.UUID,
    data: CertificateCreate,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    is_admin = session.get("role") == "admin"
    is_self = session.get("employee_id") == str(employee_id)
    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Employee not found")

    cert = Certificate(employee_id=employee_id, **data.model_dump())
    db.add(cert)
    await db.commit()
    await db.refresh(cert)
    return cert


def _check_cert_mutate_access(session: dict, employee_id: uuid.UUID):
    is_admin = session.get("role") == "admin"
    is_self = session.get("employee_id") == str(employee_id)
    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Access denied")


@router.post("/{employee_id}/certificates/{cert_id}/image")
async def upload_certificate_image(
    employee_id: uuid.UUID,
    cert_id: uuid.UUID,
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    _check_cert_mutate_access(session, employee_id)
    result = await db.execute(
        select(Certificate).where(
            Certificate.id == cert_id,
            Certificate.employee_id == employee_id,
        )
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    store_dir = os.path.join(settings.CERTIFICATE_STORAGE_PATH, str(employee_id))
    os.makedirs(store_dir, exist_ok=True)

    ext = image.filename.split(".")[-1] if image.filename else "png"
    file_name = f"{cert_id}.{ext}"
    file_path = os.path.join(store_dir, file_name)

    content = await image.read()
    with open(file_path, "wb") as f:
        f.write(content)

    cert.image_path = file_path
    await db.commit()
    await db.refresh(cert)
    return {"status": "ok", "image_path": file_path}


@router.get("/{employee_id}/certificates/{cert_id}/image")
async def get_certificate_image(
    employee_id: uuid.UUID,
    cert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    # Admins, crew leads, and the employee themselves can view certificate images
    is_admin = session.get("role") == "admin"
    is_crew_lead = session.get("role") == "crew_lead"
    is_self = session.get("employee_id") == str(employee_id)
    if not is_admin and not is_self and not is_crew_lead:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Certificate).where(
            Certificate.id == cert_id,
            Certificate.employee_id == employee_id,
        )
    )
    cert = result.scalar_one_or_none()
    if not cert or not cert.image_path or not os.path.exists(cert.image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(cert.image_path)


@router.delete("/{employee_id}/certificates/{cert_id}")
async def delete_certificate(
    employee_id: uuid.UUID,
    cert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session: dict = Depends(get_token_session),
):
    _check_cert_mutate_access(session, employee_id)
    result = await db.execute(
        select(Certificate).where(
            Certificate.id == cert_id,
            Certificate.employee_id == employee_id,
        )
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if cert.image_path and os.path.exists(cert.image_path):
        os.remove(cert.image_path)
    await db.delete(cert)
    await db.commit()
    return {"status": "deleted"}
