import httpx
from app.config import settings

SYSTEM_PROMPT = """你是一个施工报告助手。你的任务是将语音转录的原始文字进行整理和总结。
请按以下要求处理：
1. 修正明显的语音识别错误
2. 整理成通顺的书面语
3. 保留关键信息（时间、数量、原因等）
4. 输出简洁明了的总结

请直接输出整理后的文字，不要添加任何额外解释。"""


async def summarize_text(raw_text: str) -> str:
    """Send text to DeepSeek V4 Pro for cleanup and summarization."""
    if not settings.DEEPSEEK_API_KEY:
        return raw_text

    if not raw_text or raw_text.startswith("["):
        return raw_text

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"请整理以下语音转录文字：\n\n{raw_text}"},
                ],
                "temperature": 0.3,
                "max_tokens": 1000,
            },
        )

        if response.status_code != 200:
            return raw_text

        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
