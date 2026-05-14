import os
import ssl
from datetime import datetime
import httpx

from app.config import settings

_session_id: str | None = None
_session_expiry: float = 0.0


def _get_client() -> httpx.AsyncClient:
    verify = settings.NAS_VERIFY_SSL
    if not verify:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return httpx.AsyncClient(verify=ctx, timeout=settings.NAS_TIMEOUT)
    return httpx.AsyncClient(verify=True, timeout=settings.NAS_TIMEOUT)


async def _login() -> str:
    global _session_id, _session_expiry

    if _session_id and datetime.now().timestamp() < _session_expiry:
        return _session_id

    async with _get_client() as client:
        resp = await client.get(
            f"{settings.NAS_URL}/webapi/auth.cgi",
            params={
                "api": "SYNO.API.Auth",
                "version": 7,
                "method": "login",
                "account": settings.NAS_USERNAME,
                "passwd": settings.NAS_PASSWORD,
                "session": "FileStation",
                "format": "sid",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    if not data.get("success"):
        error = data.get("error", {})
        raise RuntimeError(f"NAS login failed: code={error.get('code')}, msg={error}")

    _session_id = data["data"]["sid"]
    _session_expiry = datetime.now().timestamp() + 20 * 60
    return _session_id


async def upload_video(local_file_path: str, filename: str) -> str:
    if not settings.NAS_URL or not settings.NAS_USERNAME or not settings.NAS_PASSWORD:
        raise RuntimeError("NAS not configured")

    sid = await _login()
    dest_folder = settings.NAS_SHARED_FOLDER
    upload_url = f"{settings.NAS_URL}/webapi/entry.cgi?_sid={sid}"

    max_retries = 3
    last_error: Exception | None = None

    for attempt in range(max_retries):
        if attempt > 0:
            global _session_id, _session_expiry
            _session_id = None
            _session_expiry = 0
            sid = await _login()
            upload_url = f"{settings.NAS_URL}/webapi/entry.cgi?_sid={sid}"

        try:
            async with _get_client() as client:
                with open(local_file_path, "rb") as f:
                    files = {"file": (filename, f, "video/mp4")}
                    data = {
                        "api": "SYNO.FileStation.Upload",
                        "version": "2",
                        "method": "upload",
                        "path": dest_folder,
                        "create_parents": "true",
                        "overwrite": "true",
                    }
                    resp = await client.post(
                        upload_url,
                        data=data,
                        files=files,
                        timeout=settings.NAS_UPLOAD_TIMEOUT,
                    )

                resp.raise_for_status()
                result = resp.json()

                if result.get("success"):
                    return f"{dest_folder}/{filename}"

                error = result.get("error", {})
                error_code = error.get("code")
                if error_code in (119, 180):
                    last_error = RuntimeError(f"NAS upload retryable error: {error}")
                    continue

                raise RuntimeError(f"NAS upload failed: {error}")

        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                continue
            raise

    raise last_error or RuntimeError("NAS upload failed after retries")


def generate_video_filename(work_address: str, work_date: str | None = None) -> str:
    date_str = work_date or datetime.now().strftime("%Y-%m-%d")
    sanitized = work_address.strip().replace("/", "_").replace("\\", "_")
    for ch in ":*?\"<>|":
        sanitized = sanitized.replace(ch, "_")
    sanitized = sanitized[:50]
    return f"{sanitized}_{date_str}.mp4"
