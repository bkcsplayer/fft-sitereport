from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import hashlib
import secrets
import time

router = APIRouter()

USERS = {
    "duke": {
        "password_hash": hashlib.sha256("duke123456".encode()).hexdigest(),
        "role": "user",
        "display_name": "Duke",
    },
    "admin": {
        "password_hash": hashlib.sha256("1q2w3e4R.".encode()).hexdigest(),
        "role": "admin",
        "display_name": "Admin",
    },
}

active_tokens: dict[str, dict] = {}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    display_name: str
    username: str


class TokenValidateResponse(BaseModel):
    valid: bool
    role: str | None = None
    username: str | None = None
    display_name: str | None = None


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_hash = hashlib.sha256(req.password.encode()).hexdigest()
    if password_hash != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)
    active_tokens[token] = {
        "username": req.username,
        "role": user["role"],
        "display_name": user["display_name"],
        "created_at": time.time(),
    }

    return LoginResponse(
        token=token,
        role=user["role"],
        display_name=user["display_name"],
        username=req.username,
    )


@router.get("/validate", response_model=TokenValidateResponse)
async def validate_token(token: str):
    session = active_tokens.get(token)
    if not session:
        return TokenValidateResponse(valid=False)

    return TokenValidateResponse(
        valid=True,
        role=session["role"],
        username=session["username"],
        display_name=session["display_name"],
    )


@router.post("/logout")
async def logout(token: str):
    active_tokens.pop(token, None)
    return {"status": "ok"}
