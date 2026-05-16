"""
Telegram Bot for FFT SiteReport.

Features:
- Polling-based command listener (/health, /reports, /id, /help)
- Push notifications on report lifecycle events (confirmed, completed)
- System health monitoring (DB connectivity, report stats, uptime)
"""
import asyncio
import httpx
from datetime import datetime
from sqlalchemy import text, select, func
from app.config import settings
from app.database import async_session

_polling_task: asyncio.Task | None = None
_start_time = datetime.utcnow()

# ── Messaging helpers ──────────────────────────────────────────

async def _send_message(chat_id: str, text: str, parse_mode: str = "Markdown") -> bool:
    if not settings.TELEGRAM_BOT_TOKEN:
        return False
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            )
            if resp.status_code != 200:
                body = resp.text
                print(f"[Telegram] sendMessage HTTP {resp.status_code}: {body[:300]}")
            return resp.status_code == 200
        except Exception as e:
            print(f"[Telegram] sendMessage error: {e}")
            return False


def _escape_md(text: str) -> str:
    """Escape MarkdownV2 special characters except those we intentionally use."""
    escape_chars = r"_*[]()~`>#+-=|{}.!"
    for ch in escape_chars:
        text = text.replace(ch, "\\" + ch)
    return text


def _b2s(v: bool | None) -> str:
    return "Yes" if v else "No"


# ── Health / Report queries ──────────────────────────────────

async def _db_ok() -> tuple[bool, str | None]:
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return True, None
    except Exception as e:
        return False, str(e)


async def _report_stats():
    from app.models.site_report import SiteReport
    try:
        async with async_session() as session:
            total = (await session.execute(select(func.count(SiteReport.id)))).scalar() or 0
            completed = (await session.execute(
                select(func.count(SiteReport.id)).where(SiteReport.status == "completed")
            )).scalar() or 0
            pending = (await session.execute(
                select(func.count(SiteReport.id)).where(
                    SiteReport.status.in_(["pending_signatures", "ready_for_signature"])
                )
            )).scalar() or 0
            draft = (await session.execute(
                select(func.count(SiteReport.id)).where(SiteReport.status == "draft")
            )).scalar() or 0
        return total, completed, pending, draft
    except Exception:
        return 0, 0, 0, 0


async def _employee_count() -> int:
    from app.models.employee import Employee
    try:
        async with async_session() as session:
            return (await session.execute(select(func.count(Employee.id)))).scalar() or 0
    except Exception:
        return 0


async def get_health_message() -> str:
    db_ok_val, db_err = await _db_ok()
    total, completed, pending, draft = await _report_stats()
    emp_count = await _employee_count()

    uptime = datetime.utcnow() - _start_time
    h, rem = divmod(int(uptime.total_seconds()), 3600)
    m, _ = divmod(rem, 60)

    lines = [
        "\U0001f3e5 *FFT SiteReport — System Health*",
        "━" * 20,
        "",
        f"\U0001f7e2 Database: {'OK' if db_ok_val else 'DOWN'}",
    ]
    if db_err:
        lines.append(f"  ⚠️ {db_err}")
    lines.extend([
        "",
        "\U0001f4ca *Reports*",
        f"  \U0001f4cb Total: {total}",
        f"  \U0001f4dd Draft: {draft}",
        f"  ✍️ Awaiting Signatures: {pending}",
        f"  ✅ Completed: {completed}",
        "",
        f"\U0001f465 Employees: {emp_count}",
        "",
        f"⏱ Uptime: {h}h {m}m",
    ])
    return "\n".join(lines)


async def get_recent_reports_message() -> str:
    from app.models.site_report import SiteReport
    try:
        async with async_session() as session:
            result = await session.execute(
                select(SiteReport).order_by(SiteReport.created_at.desc()).limit(5)
            )
            reports = result.scalars().all()

        if not reports:
            return "\U0001f4cb No reports yet."

        emoji_map = {
            "draft": "\U0001f4dd",
            "ready_for_signature": "✍️",
            "pending_signatures": "\U0001f58a️",
            "completed": "✅",
        }
        lines = ["\U0001f4cb *Recent Reports*", "━" * 20, ""]
        for r in reports:
            e = emoji_map.get(r.status, "\U0001f4cb")
            lines.append(f"{e} [{r.work_date}] {r.work_address[:40]}")
            lines.append(f"   └ {r.status} | {r.installation_quantity} panels")
        return "\n".join(lines)
    except Exception as e:
        return f"⚠️ Failed: {e}"


# ── Bot command processing ────────────────────────────────────

async def _process_update(update: dict) -> None:
    msg = update.get("message", {})
    text = (msg.get("text") or "").strip()
    chat_id = msg.get("chat", {}).get("id")
    if not text or not chat_id:
        return

    cmd = text.split()[0].lower().lstrip("/").split("@")[0]

    if cmd in ("health", "status"):
        await _send_message(str(chat_id), await get_health_message())
    elif cmd == "reports":
        await _send_message(str(chat_id), await get_recent_reports_message())
    elif cmd == "id":
        await _send_message(str(chat_id), f"\U0001f194 Chat ID: `{chat_id}`")
    elif cmd in ("help", "start"):
        await _send_message(str(chat_id), (
            "\U0001f916 *FFT SiteReport Bot*\n"
            "━" * 20 + "\n\n"
            "/health — System health & report stats\n"
            "/reports — Last 5 reports\n"
            "/id — Show this chat ID\n"
            "/help — This help"
        ))


# ── Long-polling loop ─────────────────────────────────────────

async def _poll_loop() -> None:
    if not settings.TELEGRAM_BOT_TOKEN:
        print("[Telegram] Bot token not configured — disabled")
        return

    print(f"[Telegram] Bot started — token {settings.TELEGRAM_BOT_TOKEN[:8]}...")
    print(f"[Telegram] Chat ID: {settings.TELEGRAM_CHAT_ID or '(not set — notifications disabled)'}")
    last_update_id = 0

    async with httpx.AsyncClient(timeout=35.0) as client:
        while True:
            try:
                url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getUpdates"
                resp = await client.get(url, params={
                    "offset": last_update_id + 1,
                    "timeout": 30,
                })
                data = resp.json()
                if data.get("ok"):
                    for upd in data.get("result", []):
                        await _process_update(upd)
                        last_update_id = upd["update_id"]
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[Telegram] Poll error: {e}")
                await asyncio.sleep(5)

    print("[Telegram] Bot stopped.")


# ── Lifecycle ─────────────────────────────────────────────────

def start_bot() -> None:
    """Launch polling in background. Safe to call even if token is missing."""
    global _polling_task
    if not settings.TELEGRAM_BOT_TOKEN:
        print("[Telegram] Skipped — TELEGRAM_BOT_TOKEN is empty")
        return
    _polling_task = asyncio.create_task(_poll_loop())


async def stop_bot() -> None:
    global _polling_task
    if _polling_task:
        _polling_task.cancel()
        try:
            await _polling_task
        except asyncio.CancelledError:
            pass
        _polling_task = None


# ── Push notifications ───────────────────────────────────────

async def notify_report_confirmed(report_id: str) -> bool:
    """Notify channel that report is ready for worker signatures."""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return False

    from app.models.site_report import SiteReport, SiteReportWorker
    from sqlalchemy.orm import selectinload

    async with async_session() as session:
        result = await session.execute(
            select(SiteReport)
            .options(selectinload(SiteReport.workers))
            .where(SiteReport.id == report_id)
        )
        sr = result.scalar_one_or_none()
        if not sr:
            return False

        workers: list = sr.workers or []
        crew_lead = next((w.employee_name for w in workers if w.is_crew_lead), "Unknown")
        worker_names = "\n".join(
            f"  • {w.employee_name}{' (Crew Lead)' if w.is_crew_lead else ''}"
            for w in workers
        )

    message = (
        "✍️ *Report Ready for Signing*\n"
        "━" * 20 + "\n\n"
        f"\U0001f4c5 Date: {sr.work_date}\n"
        f"\U0001f4cd Address: {sr.work_address}\n"
        f"\U0001f477 Crew Lead: {crew_lead}\n"
        f"\U0001f527 Panels: {sr.installation_quantity}\n"
        f"\U0001f4ca Status: READY_FOR_SIGNATURE\n\n"
        f"\U0001f465 *Workers ({len(workers)})*\n"
        f"{worker_names}\n\n"
        "━" * 20 + "\n"
        "Workers: open the Worker Dashboard to sign FPP & HA."
    )
    ok = await _send_message(settings.TELEGRAM_CHAT_ID, message)
    if ok:
        print(f"[Telegram] Sent: report confirmed — {report_id}")
    else:
        print(f"[Telegram] FAILED to send report confirmed — {report_id}")
    return ok


async def notify_report_completed(report_id: str) -> bool:
    """Notify channel that all workers have signed and report is complete."""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return False

    from app.models.site_report import SiteReport
    from sqlalchemy.orm import selectinload

    async with async_session() as session:
        result = await session.execute(
            select(SiteReport)
            .options(
                selectinload(SiteReport.workers),
                selectinload(SiteReport.signatures),
            )
            .where(SiteReport.id == report_id)
        )
        sr = result.scalar_one_or_none()
        if not sr:
            return False

        workers = sr.workers or []
        sigs = sr.signatures or []
        crew_lead = next((w.employee_name for w in workers if w.is_crew_lead), "Unknown")
        signed_count = sum(1 for s in sigs if s.status == "signed")

    message = (
        "✅ *Report Completed*\n"
        "━" * 20 + "\n\n"
        f"\U0001f4c5 Date: {sr.work_date}\n"
        f"\U0001f4cd Address: {sr.work_address}\n"
        f"\U0001f477 Crew Lead: {crew_lead}\n"
        f"✍️ Signatures: {signed_count}/{len(workers) * 2}\n"
        f"\U0001f4ca Status: COMPLETED\n\n"
        "━" * 20
    )
    ok = await _send_message(settings.TELEGRAM_CHAT_ID, message)
    if ok:
        print(f"[Telegram] Sent: report completed — {report_id}")
    else:
        print(f"[Telegram] FAILED to send report completed — {report_id}")
    return ok
