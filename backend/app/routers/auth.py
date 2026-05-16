from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt
import hashlib
import secrets
import time
from typing import Optional

from app.database import get_db
from app.models.employee import Employee
from app.config import settings

router = APIRouter()

# Pre-hash admin password once at startup
ADMIN_PASSWORD_HASH = bcrypt.hashpw(settings.ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()

active_tokens: dict[str, dict] = {}


def get_token_from_request(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
) -> str:
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    if token:
        return token
    raise HTTPException(status_code=401, detail="Authentication required")


def get_token_session(auth_token: str = Depends(get_token_from_request)) -> dict:
    session = active_tokens.get(auth_token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if time.time() - session["created_at"] > settings.TOKEN_EXPIRE_SECONDS:
        active_tokens.pop(auth_token, None)
        raise HTTPException(status_code=401, detail="Token expired")
    return session


def admin_required(session: dict = Depends(get_token_session)):
    if session.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return session


def crew_lead_or_admin_required(session: dict = Depends(get_token_session)):
    if session.get("role") not in ("admin", "crew_lead"):
        raise HTTPException(status_code=403, detail="Crew lead or admin access required")
    return session


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str  # "admin", "crew_lead", or "worker"
    display_name: str
    username: str
    employee_id: str | None = None


class TokenValidateResponse(BaseModel):
    valid: bool
    role: str | None = None
    username: str | None = None
    display_name: str | None = None
    employee_id: str | None = None


def _make_session(username: str, role: str, display_name: str, employee_id: str | None) -> tuple[str, dict]:
    token = secrets.token_urlsafe(32)
    active_tokens[token] = {
        "username": username,
        "role": role,
        "display_name": display_name,
        "employee_id": employee_id,
        "created_at": time.time(),
    }
    return token, active_tokens[token]


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Check admin from env
    if req.username == settings.ADMIN_USERNAME and bcrypt.checkpw(req.password.encode(), ADMIN_PASSWORD_HASH.encode()):
        token, _ = _make_session(settings.ADMIN_USERNAME, "admin", "Admin", None)
        return LoginResponse(token=token, role="admin", display_name="Admin", username=settings.ADMIN_USERNAME)

    # Check employees table
    result = await db.execute(
        select(Employee).where(
            Employee.username == req.username,
            Employee.is_active == True,
        )
    )
    emp = result.scalar_one_or_none()

    if not emp:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Try bcrypt first; fall back to legacy SHA256, then auto-upgrade
    password_ok = False
    if emp.password_hash:
        try:
            password_ok = bcrypt.checkpw(req.password.encode(), emp.password_hash.encode())
        except ValueError:
            pass  # Not a valid bcrypt hash, try SHA256
    if not password_ok:
        legacy_hash = hashlib.sha256(req.password.encode()).hexdigest()
        if emp.password_hash == legacy_hash:
            password_ok = True
            # Auto-upgrade: re-hash with bcrypt
            emp.password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
            await db.commit()

    if not password_ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token, _ = _make_session(
        username=emp.username,
        role=emp.role,
        display_name=emp.name,
        employee_id=str(emp.id),
    )

    return LoginResponse(
        token=token,
        role=emp.role,
        display_name=emp.name,
        username=emp.username,
        employee_id=str(emp.id),
    )


@router.get("/validate", response_model=TokenValidateResponse)
async def validate_token(auth_token: str = Depends(get_token_from_request)):
    session = active_tokens.get(auth_token)
    if not session:
        return TokenValidateResponse(valid=False)
    if time.time() - session["created_at"] > settings.TOKEN_EXPIRE_SECONDS:
        active_tokens.pop(auth_token, None)
        return TokenValidateResponse(valid=False)

    return TokenValidateResponse(
        valid=True,
        role=session["role"],
        username=session["username"],
        display_name=session["display_name"],
        employee_id=session.get("employee_id"),
    )


@router.post("/logout")
async def logout(auth_token: str = Depends(get_token_from_request)):
    active_tokens.pop(auth_token, None)
    return {"status": "ok"}
