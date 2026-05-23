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


async def notify_report_submitted(report_id: str) -> bool:
    """Notify channel with FULL report detail after Post-Work submission."""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return False

    from app.models.site_report import SiteReport, Milestone, VoiceRecording, VoiceTranscript
    from app.models.safety import FallProtectionPlan, HazardAssessment
    from sqlalchemy.orm import selectinload

    async with async_session() as session:
        result = await session.execute(
            select(SiteReport)
            .options(
                selectinload(SiteReport.workers),
                selectinload(SiteReport.signatures),
                selectinload(SiteReport.milestones),
                selectinload(SiteReport.fall_protection_plan),
                selectinload(SiteReport.hazard_assessment),
            )
            .where(SiteReport.id == report_id)
        )
        sr = result.scalar_one_or_none()
        if not sr:
            return False

        workers = sr.workers or []
        sigs = sr.signatures or []
        milestones = sr.milestones or []
        fpp = sr.fall_protection_plan
        ha = sr.hazard_assessment

        crew_lead = next((w.employee_name for w in workers if w.is_crew_lead), "Unknown")
        signed_count = sum(1 for s in sigs if s.status == "signed")
        total_sigs = len(workers) * 2 if workers else 0

        status_emoji = {
            "draft": "\U0001f4dd",
            "ready_for_signature": "✍️",
            "pending_signatures": "\U0001f58a",
            "completed": "✅",
            "needs_review": "⚠️",
        }.get(sr.status, "\U0001f4cb")

        lines = [
            "\U0001f4cb *Report Submitted — Full Detail*",
            "━" * 20,
            "",
            "\U0001f4c5 *Basic Info*",
            f"  Date: {sr.work_date}",
            f"  Address: {sr.work_address}",
            f"  Employer: {sr.employer}",
            f"  Panels: {sr.installation_quantity}",
            f"  Status: {status_emoji} {sr.status.upper()}",
            "",
        ]

        # Workers with clock times
        lines.append("\U0001f465 *Crew ({})*".format(len(workers)))
        for w in workers:
            lead_tag = " (Crew Lead)" if w.is_crew_lead else ""
            ci = _fmt_dt(w.clock_in_time)
            co = _fmt_dt(w.clock_out_time)
            lines.append(f"  • {w.employee_name}{lead_tag}")
            if ci or co:
                lines.append(f"    ⏱ In: {ci} | Out: {co}")
        lines.append("")

        # FPP summary
        if fpp:
            lines.append("\U0001f6e1 *Fall Protection Plan*")
            lines.append(f"  Anchor: {fpp.anchor_type or '-'} x{fpp.anchor_count or 0}")
            if fpp.fall_hazards:
                lines.append(f"  Hazards: {fpp.fall_hazards[:120]}")
            if fpp.clearance_f_total is not None:
                lines.append(f"  Clearance: {fpp.clearance_f_total} ft (A+B+C+D+E)")
            lines.append("")

        # HA summary
        if ha:
            items = ha.hazard_items or []
            lines.append("⚠️ *Hazard Assessment*")
            lines.append(f"  Reviewed: {_b2s(ha.all_hazards_reviewed)}")
            lines.append(f"  Hazards identified: {len(items)}")
            for item in items[:5]:
                if isinstance(item, dict):
                    lines.append(f"  • {item.get('hazard', '?')[:80]}")
            lines.append("")

        # Signatures
        if sigs:
            lines.append("✍️ *Signatures* ({}/{})".format(signed_count, total_sigs))
            for s in sigs:
                status_icon = "✅" if s.status == "signed" else "⬜"
                doc = "FPP" if "fpp" in s.document_type.lower() else "HA"
                lines.append(f"  {status_icon} {s.worker_name} — {doc}")
            lines.append("")

        # Milestones
        if milestones:
            lines.append("\U0001f4ca *Milestones*")
            for m in milestones:
                et = m.estimated_completion_time.strftime("%H:%M") if m.estimated_completion_time else "--:--"
                at = m.actual_completion_time.strftime("%H:%M") if m.actual_completion_time else "--:--"
                flag = "✅" if m.completed_as_expected else f"⚠️ Delayed: {m.delay_reason or '-'}"
                lines.append(f"  • {m.milestone_type}")
                lines.append(f"    Est: {et} | Act: {at} | {flag}")
            lines.append("")

        # Voice recordings
        voice_result = await session.execute(
            select(VoiceRecording).where(VoiceRecording.site_report_id == report_id)
            .options(selectinload(VoiceRecording.transcript))
        )
        recordings = voice_result.scalars().all()
        if recordings:
            lines.append("\U0001f399 *Voice Summaries*")
            for vr in recordings:
                dur = f"{vr.duration_seconds:.0f}s" if vr.duration_seconds else "?"
                text = vr.transcript.processed_text if vr.transcript else None
                snippet = (text[:120] + "...") if text and len(text) > 120 else (text or "(no transcript)")
                lines.append(f"  • [{dur}] {snippet}")
            lines.append("")

        lines.extend([
            "━" * 20,
            f"\U0001f4c5 Submitted at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        ])

    message = "\n".join(lines)
    ok = await _send_message(settings.TELEGRAM_CHAT_ID, message)
    if ok:
        print(f"[Telegram] Sent: report submitted — {report_id}")
    else:
        print(f"[Telegram] FAILED to send report submitted — {report_id}")
    return ok


def _fmt_dt(v) -> str:
    if v is None:
        return "-"
    if isinstance(v, datetime):
        return v.strftime("%H:%M")
    return str(v)[:5]
