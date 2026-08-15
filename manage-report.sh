#!/bin/bash

#####################################################
# Report Server Management
# Quản lý server phục vụ kho lịch sử các lần chạy
#####################################################

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_PORT=9323
ARTIFACT_DIR="${PROJECT_DIR}/artifacts"
RUNS_DIR="${ARTIFACT_DIR}/runs"
PID_FILE="${ARTIFACT_DIR}/.report-server.pid"
LOG_FILE="${ARTIFACT_DIR}/.report-server.log"
HTTP_SERVER="${PROJECT_DIR}/node_modules/.bin/http-server"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo -e "  $0 start      - Khởi động report server"
    echo -e "  $0 stop       - Dừng report server"
    echo -e "  $0 restart    - Khởi động lại"
    echo -e "  $0 status     - Trạng thái server"
    echo -e "  $0 logs       - Xem log server"
    echo -e "  $0 url        - In URL"
    echo -e "  $0 reindex    - Dựng lại trang danh sách từ dữ liệu trên đĩa"
    echo -e "  $0 migrate    - Chuyển báo cáo cũ (trước khi có kho) thành run 'legacy'"
}

is_running() {
    [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

start_server() {
    if is_running; then
        echo -e "${YELLOW}⚠️  Server đang chạy rồi${NC}"; show_url; return 0
    fi
    mkdir -p "$RUNS_DIR"
    echo -e "${BLUE}🌐 Khởi động report server...${NC}"
    nohup "$HTTP_SERVER" "$RUNS_DIR" -p "$REPORT_PORT" -c-1 --silent > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
    if is_running; then
        echo -e "${GREEN}✅ Server đã chạy${NC}"; show_url
    else
        echo -e "${RED}❌ Không khởi động được, xem $LOG_FILE${NC}"; return 1
    fi
}

stop_server() {
    if ! is_running; then
        echo -e "${YELLOW}⚠️  Server không chạy${NC}"; rm -f "$PID_FILE"; return 0
    fi
    echo -e "${BLUE}🛑 Dừng report server...${NC}"
    kill "$(cat "$PID_FILE")" 2>/dev/null
    rm -f "$PID_FILE"
    echo -e "${GREEN}✅ Đã dừng${NC}"
}

show_status() {
    if is_running; then
        echo -e "${GREEN}✅ Server ĐANG CHẠY (PID $(cat "$PID_FILE"))${NC}"; show_url
    else
        echo -e "${RED}❌ Server KHÔNG CHẠY${NC}"
    fi
    local count
    count=$(find "$RUNS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
    echo -e "${BLUE}📦 Số lần chạy trong kho: ${count}${NC}"
}

show_logs() {
    [ -f "$LOG_FILE" ] || { echo -e "${RED}❌ Chưa có log${NC}"; return 1; }
    tail -f "$LOG_FILE"
}

show_url() {
    local ip
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    [ -z "$ip" ] && ip="localhost"
    echo -e "\n${BLUE}=========================================${NC}"
    echo -e "${GREEN}🌐 Kho lịch sử:${NC}"
    echo -e "  ${YELLOW}http://${ip}:${REPORT_PORT}/${NC}"
    echo -e "  ${YELLOW}http://localhost:${REPORT_PORT}/${NC}"
    echo -e "${BLUE}=========================================${NC}"
}

reindex() {
    echo -e "${BLUE}🔄 Dựng lại trang danh sách...${NC}"
    "${PROJECT_DIR}/build-index.sh" "$RUNS_DIR" > /dev/null \
        && echo -e "${GREEN}✅ Xong${NC}" \
        || { echo -e "${RED}❌ Thất bại${NC}"; return 1; }
}

# Chuyển báo cáo cũ (thời còn ghi đè một chỗ) thành một run tên 'legacy'.
# data/ bị xoá vì tên file trong đó là hash, không có gì liên kết ngược về lần chạy,
# và mọi index.html cũ đã bị ghi đè từ lâu — phần lớn dung lượng đó là file mồ côi.
migrate() {
    local old_report="${ARTIFACT_DIR}/playwright-report"
    if [ ! -f "${old_report}/index.html" ]; then
        echo -e "${YELLOW}⚠️  Không thấy báo cáo cũ ở ${old_report}, bỏ qua${NC}"; return 0
    fi

    local legacy_dir="${RUNS_DIR}/0000-00-00_000000_legacy"
    echo -e "${BLUE}📦 Chuyển báo cáo cũ thành run 'legacy'...${NC}"
    echo -e "${YELLOW}   Dung lượng sẽ được giải phóng: $(du -sh "${old_report}/data" 2>/dev/null | cut -f1)${NC}"

    mkdir -p "$legacy_dir"
    mv "${old_report}/index.html" "${legacy_dir}/index.html"
    [ -f "${ARTIFACT_DIR}/results.xml" ] && mv "${ARTIFACT_DIR}/results.xml" "${legacy_dir}/results.xml"

    local total=0 failed=0
    if [ -f "${legacy_dir}/results.xml" ]; then
        total=$(grep -o '<testcase' "${legacy_dir}/results.xml" | wc -l | tr -d ' ')
        failed=$(grep -o '<failure' "${legacy_dir}/results.xml" | wc -l | tr -d ' ')
    fi

    cat > "${legacy_dir}/meta.env" <<EOF
RUN_ID=0000-00-00_000000_legacy
PROJECT=legacy
STARTED_AT=$(date -Iseconds -r "${legacy_dir}/index.html" 2>/dev/null || date -Iseconds)
FINISHED_AT=$(date -Iseconds)
EXIT_CODE=0
TOTAL=${total}
FAILED=${failed}
HAS_REPORT=1
HAS_DATA=0
EOF

    if [ -f "${legacy_dir}/index.html" ]; then
        rm -rf "$old_report"
        reindex
        echo -e "${GREEN}✅ Đã chuyển xong và dọn báo cáo cũ${NC}"
    else
        echo -e "${RED}❌ Không chuyển được index.html sang ${legacy_dir}; giữ nguyên ${old_report} để không mất dữ liệu${NC}"
        return 1
    fi
}

case "$1" in
    start)   start_server ;;
    stop)    stop_server ;;
    restart) stop_server; sleep 1; start_server ;;
    status)  show_status ;;
    logs)    show_logs ;;
    url)     show_url ;;
    reindex) reindex ;;
    migrate) migrate ;;
    *)       show_usage; exit 1 ;;
esac
