from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import init_db, async_session
from app.routers import voice, admin, options, auth
from app.routers import employees, certificates, site_reports, signatures, snapshots, workers
from app.services import telegram_bot


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    telegram_bot.start_bot()
    yield
    await telegram_bot.stop_bot()


app = FastAPI(title="FFT Site Report API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(options.router, prefix="/api/options", tags=["options"])

app.include_router(employees.router, prefix="/api/employees", tags=["employees"])
app.include_router(certificates.router, prefix="/api/certificates", tags=["certificates"])
app.include_router(site_reports.router, prefix="/api/site-reports", tags=["site-reports"])
app.include_router(signatures.router, prefix="/api/signatures", tags=["signatures"])
app.include_router(snapshots.router, prefix="/api/snapshots", tags=["snapshots"])
app.include_router(workers.router, prefix="/api/worker", tags=["workers"])


@app.get("/api/health")
async def health():
    db_ok = True
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {"status": "ok", "database": "connected" if db_ok else "disconnected"}
