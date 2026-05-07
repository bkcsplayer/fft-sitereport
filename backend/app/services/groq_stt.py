import httpx
from app.config import settings


async def transcribe_audio(file_path: str) -> str:
    """Send audio to Groq Whisper API for transcription."""
    if not settings.GROQ_API_KEY:
        return "[STT Disabled - No GROQ_API_KEY configured]"

    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(file_path, "rb") as audio_file:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files={"file": ("audio.webm", audio_file, "audio/webm")},
                data={
                    "model": "whisper-large-v3",
                    "language": "zh",
                    "response_format": "text",
                },
            )

        if response.status_code != 200:
            return f"[Transcription Error: {response.status_code} - {response.text}]"

        return response.text.strip()
