import uuid
import os
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio
import json

from app.database import get_db
from app.models import VoiceRecording, VoiceTranscript
from app.config import settings
from app.services.groq_stt import transcribe_audio
from app.services.deepseek_summary import summarize_text
from app.services import nas_service
from app.routers.site_reports import _upload_to_nas_bg

router = APIRouter()


@router.post("/transcribe")
async def transcribe_voice(
    audio: UploadFile = File(...),
    field_id: str = Form(default="voice_note"),
    site_report_id: uuid.UUID | None = Form(None),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    recording_id = uuid.uuid4()
    file_ext = audio.filename.split(".")[-1] if audio.filename else "webm"
    file_name = f"{recording_id}.{file_ext}"
    file_path = os.path.join(settings.AUDIO_STORAGE_PATH, file_name)

    os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)
    content = await audio.read()
    with open(file_path, "wb") as f:
        f.write(content)

    recording = VoiceRecording(
        id=recording_id,
        site_report_id=site_report_id,
        field_id=field_id,
        file_path=file_path,
        file_size=len(content),
        mime_type=audio.content_type or "audio/webm",
    )
    db.add(recording)
    await db.commit()

    if site_report_id:
        nas_filename = nas_service.generate_video_filename(f"Voice_{site_report_id}_{field_id}").replace(".mp4", f".{file_ext}")
        background_tasks.add_task(_upload_to_nas_bg, recording_id, "audio", file_path, nas_filename)

    raw_text = await transcribe_audio(file_path)

    processed_text = await summarize_text(raw_text)

    transcript = VoiceTranscript(
        recording_id=recording_id,
        raw_text=raw_text,
        processed_text=processed_text,
    )
    db.add(transcript)
    await db.commit()

    return {
        "recording_id": str(recording_id),
        "raw_text": raw_text,
        "processed_text": processed_text,
    }


@router.post("/transcribe-stream")
async def transcribe_voice_stream(
    audio: UploadFile = File(...),
    field_id: str = Form(default="voice_note"),
    site_report_id: uuid.UUID | None = Form(None),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    recording_id = uuid.uuid4()
    file_ext = audio.filename.split(".")[-1] if audio.filename else "webm"
    file_name = f"{recording_id}.{file_ext}"
    file_path = os.path.join(settings.AUDIO_STORAGE_PATH, file_name)

    os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)
    content = await audio.read()
    with open(file_path, "wb") as f:
        f.write(content)

    recording = VoiceRecording(
        id=recording_id,
        site_report_id=site_report_id,
        field_id=field_id,
        file_path=file_path,
        file_size=len(content),
        mime_type=audio.content_type or "audio/webm",
    )
    db.add(recording)
    await db.commit()

    if site_report_id:
        nas_filename = nas_service.generate_video_filename(f"Voice_{site_report_id}_{field_id}").replace(".mp4", f".{file_ext}")
        background_tasks.add_task(_upload_to_nas_bg, recording_id, "audio", file_path, nas_filename)

    async def event_generator():
        yield f"data: {json.dumps({'stage': 'uploading', 'progress': 100, 'message': '音频上传完成'})}\n\n"

        yield f"data: {json.dumps({'stage': 'transcribing', 'progress': 30, 'message': '正在转换语音...'})}\n\n"
        raw_text = await transcribe_audio(file_path)
        yield f"data: {json.dumps({'stage': 'transcribing', 'progress': 60, 'message': '语音转换完成'})}\n\n"

        yield f"data: {json.dumps({'stage': 'summarizing', 'progress': 70, 'message': '正在整理文字...'})}\n\n"
        processed_text = await summarize_text(raw_text)
        yield f"data: {json.dumps({'stage': 'summarizing', 'progress': 90, 'message': '文字整理完成'})}\n\n"

        async with async_session_ctx() as session:
            transcript = VoiceTranscript(
                recording_id=recording_id,
                raw_text=raw_text,
                processed_text=processed_text,
            )
            session.add(transcript)
            await session.commit()

        yield f"data: {json.dumps({'stage': 'done', 'progress': 100, 'recording_id': str(recording_id), 'raw_text': raw_text, 'processed_text': processed_text})}\n\n"

    from app.database import async_session as async_session_ctx

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{recording_id}/audio")
async def get_audio(recording_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VoiceRecording).where(VoiceRecording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    if not os.path.exists(recording.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(recording.file_path, media_type=recording.mime_type)
