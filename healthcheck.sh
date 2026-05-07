#!/bin/bash
# FFT SiteReport Health Check Script
# Runs via cron, sends results to Telegram

TELEGRAM_BOT_TOKEN="TELEGRAM_BOT_TOKEN_PLACEHOLDER"
TELEGRAM_CHAT_ID="TELEGRAM_CHAT_ID_PLACEHOLDER"
DOMAIN="https://sitereport.khtain.com"
COMPOSE_DIR="/www/wwwroot/sitereport.khtain.com"

ERRORS=""
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')

# Check frontend
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$DOMAIN")
if [ "$HTTP_CODE" != "200" ]; then
    ERRORS="${ERRORS}❌ Frontend DOWN (HTTP $HTTP_CODE)\n"
else
    FRONTEND_OK="✅ Frontend OK"
fi

# Check API health
API_HEALTH=$(curl -s --max-time 10 "$DOMAIN/api/health")
if echo "$API_HEALTH" | grep -q '"ok"'; then
    API_OK="✅ API Health OK"
else
    ERRORS="${ERRORS}❌ API Health FAILED: $API_HEALTH\n"
fi

# Check API options endpoint
OPTIONS=$(curl -s --max-time 10 "$DOMAIN/api/options/project_list")
if echo "$OPTIONS" | grep -q '"category"'; then
    DB_OK="✅ Database OK"
else
    ERRORS="${ERRORS}❌ Database/Options FAILED: $OPTIONS\n"
fi

# Check Docker containers
CONTAINERS=$(cd "$COMPOSE_DIR" && docker compose ps --format '{{.Name}} {{.Status}}' 2>&1)
CONTAINER_STATUS=""
UNHEALTHY=0

while IFS= read -r line; do
    NAME=$(echo "$line" | awk '{print $1}')
    STATUS=$(echo "$line" | cut -d' ' -f2-)
    SHORT_NAME=$(echo "$NAME" | sed 's/sitereportkhtaincom-//;s/-1//')
    if echo "$STATUS" | grep -qi "up"; then
        CONTAINER_STATUS="${CONTAINER_STATUS}  ✅ $SHORT_NAME: running\n"
    else
        CONTAINER_STATUS="${CONTAINER_STATUS}  ❌ $SHORT_NAME: $STATUS\n"
        UNHEALTHY=1
    fi
done <<< "$CONTAINERS"

if [ "$UNHEALTHY" -eq 1 ]; then
    ERRORS="${ERRORS}❌ Container(s) unhealthy\n"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    ERRORS="${ERRORS}⚠️ Disk usage HIGH: ${DISK_USAGE}%\n"
fi
DISK_INFO="💾 Disk: ${DISK_USAGE}%"

# Build message
if [ -z "$ERRORS" ]; then
    MSG="🟢 *FFT SiteReport - System Healthy*

⏰ $TIMESTAMP

$FRONTEND_OK
$API_OK
$DB_OK
$DISK_INFO

📦 *Containers:*
$(echo -e "$CONTAINER_STATUS")"
else
    MSG="🔴 *FFT SiteReport - ALERT*

⏰ $TIMESTAMP

*Issues Found:*
$(echo -e "$ERRORS")
$DISK_INFO

📦 *Containers:*
$(echo -e "$CONTAINER_STATUS")"

    # Try to auto-recover by restarting
    cd "$COMPOSE_DIR" && docker compose restart 2>/dev/null
    MSG="${MSG}

🔄 Auto-restart attempted"
fi

# Send to Telegram
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" \
    -d parse_mode="Markdown" \
    -d text="$MSG" > /dev/null 2>&1
