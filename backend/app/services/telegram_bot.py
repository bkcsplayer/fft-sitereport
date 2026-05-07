import httpx
from app.config import settings
from app.models import Report


async def send_report_to_telegram(report: Report) -> bool:
    """Send a formatted report to Telegram."""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return False

    plan_status = "✅ 是" if report.daily_plan_completed else "❌ 否"
    if not report.daily_plan_completed and report.daily_plan_incomplete_reason:
        plan_status += f" ({report.daily_plan_incomplete_reason})"

    attendance_lines = []
    for att in report.attendance_records:
        attendance_lines.append(
            f"  • {att.employee_name}: {att.arrival_time.strftime('%H:%M')} - {att.departure_time.strftime('%H:%M')}"
        )
    attendance_text = "\n".join(attendance_lines) if attendance_lines else "  无记录"

    milestone_lines = []
    for ms in report.milestones:
        label = "Rough-in" if ms.milestone_type == "rough_in" else "全部安装"
        status = "✅ 按时" if ms.completed_as_expected else f"⚠️ 延迟"
        if not ms.completed_as_expected and ms.delay_reason:
            status += f" - {ms.delay_reason}"
        milestone_lines.append(
            f"  • {label}: 预计 {ms.estimated_completion_time.strftime('%H:%M')} / "
            f"实际 {ms.actual_completion_time.strftime('%H:%M')} {status}"
        )
    milestones_text = "\n".join(milestone_lines) if milestone_lines else "  无记录"

    message = f"""📋 *施工日报 - Installation Report*
━━━━━━━━━━━━━━━━━━━━

📅 日期: {report.work_date.strftime('%Y-%m-%d')}
📍 地址: {report.work_address}
👷 领队: {report.crew_leader_name}
🔧 今日安装板数: {report.panels_installed_today}

📊 *施工计划完成情况*
{plan_status}

👥 *员工出勤*
{attendance_text}

🏗️ *施工阶段进度*
{milestones_text}

━━━━━━━━━━━━━━━━━━━━"""

    if report.summary:
        message += f"\n\n📝 *总结*\n{report.summary}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown",
                },
            )
            return response.status_code == 200
        except Exception:
            return False
