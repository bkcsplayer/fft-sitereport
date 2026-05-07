from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://fft:fft_secret@localhost:5432/fft_sitereport"
    GROQ_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    AUDIO_STORAGE_PATH: str = "/data/audio"

    class Config:
        env_file = ".env"


settings = Settings()
