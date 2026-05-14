import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.config import settings
from app.services.nas_service import upload_video as upload_to_nas, generate_video_filename

router = APIRouter()


@router.post("/upload")
async def upload_video_endpoint(
    video: UploadFile = File(...),
    work_address: str = Form(...),
):
    if not work_address.strip():
        raise HTTPException(status_code=400, detail="work_address is required")

    tmp_dir = settings.AUDIO_STORAGE_PATH
    os.makedirs(tmp_dir, exist_ok=True)

    tmp_name = f"video_tmp_{uuid.uuid4()}.mp4"
    tmp_path = os.path.join(tmp_dir, tmp_name)

    try:
        content = await video.read()
        with open(tmp_path, "wb") as f:
            f.write(content)

        filename = generate_video_filename(work_address)
        nas_path = await upload_to_nas(tmp_path, filename)

        return {"nas_path": nas_path}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NAS upload failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
