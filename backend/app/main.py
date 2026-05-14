from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import reports, voice, admin, options, auth, video


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="FFT Site Report API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(options.router, prefix="/api/options", tags=["options"])
app.include_router(video.router, prefix="/api/video", tags=["video"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
