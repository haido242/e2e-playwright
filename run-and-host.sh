#!/bin/bash

#####################################################
# E2E Test Runner with Run History
# Chạy test, lưu kết quả thành một lần chạy riêng, rồi host kho lịch sử
# Usage: ./run-and-host.sh [PROJECT_NAME]
# Example: ./run-and-host.sh tpa-chrome
#####################################################

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_PORT=9323
IMAGE_NAME="haido2402/e2e-playwright-e2e:latest"
KEEP_ATTACHMENTS=20

ARTIFACT_DIR="${PROJECT_DIR}/artifacts"
RUNS_DIR="${ARTIFACT_DIR}/runs"
PID_FILE="${ARTIFACT_DIR}/.report-server.pid"
LOG_FILE="${ARTIFACT_DIR}/.report-server.log"
LOCK_FILE="${ARTIFACT_DIR}/.run.lock"
HTTP_SERVER="${PROJECT_DIR}/node_modules/.bin/http-server"

PROJECT_NAME="${1:-tpa-chrome}"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

# Tên project đi thẳng vào đường dẫn thư mục nên phải chặn ký tự lạ
if ! echo "$PROJECT_NAME" | grep -qE '^[a-z0-9-]+$'; then
    echo -e "${RED}❌ Tên project không hợp lệ: '$PROJECT_NAME' (chỉ nhận a-z, 0-9, dấu gạch ngang)${NC}"
    exit 2
fi

mkdir -p "$ARTIFACT_DIR" "$RUNS_DIR"

# Hai lần chạy song song sẽ tranh vùng đệm artifacts/playwright-report.
# flock cho lần thứ hai chờ thay vì trộn kết quả của nhau.
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo -e "${YELLOW}⏳ Đang có lần chạy khác, chờ tới lượt...${NC}"
    flock 200
fi

. "${PROJECT_DIR}/lib/run-archive.sh"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🚀 E2E Test Runner & Report Host${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "${YELLOW}📋 Project: $PROJECT_NAME${NC}"

cd "$PROJECT_DIR" || exit 1

echo -e "\n${YELLOW}📥 Pulling latest Docker image...${NC}"
docker pull "$IMAGE_NAME"

# Mốc thời gian lấy TRƯỚC khi chạy: mã lần chạy phản ánh lúc test khởi động,
# không phải lúc lưu trữ (một lần chạy có thể kéo 15 phút).
STARTED_AT="$(date -Iseconds)"
RUN_ID="$(date +%Y-%m-%d_%H%M%S)_${PROJECT_NAME}"

echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}🧪 Running E2E Tests${NC}"
echo -e "${BLUE}=========================================${NC}"

docker run --rm \
  --network host \
  --env-file .env \
  -v "${ARTIFACT_DIR}:/artifacts" \
  -v "${PROJECT_DIR}/tests:/runner/tests" \
  -v "${PROJECT_DIR}/playwright.config.ts:/runner/playwright.config.ts" \
  -v "${PROJECT_DIR}/.auth:/runner/.auth" \
  -v "${PROJECT_DIR}/global-setup.ts:/runner/global-setup.ts" \
  "$IMAGE_NAME" --project="$PROJECT_NAME"

TEST_EXIT_CODE=$?

# Image playwright chạy bằng root (không đổi USER trong Dockerfile) nên mọi file ghi ra
# /artifacts đều thành sở hữu root trên host. Không chown lại thì các bước archive/prune bên
# dưới (mv, rm) sẽ permission denied với bất kỳ user nào khác root gọi script (CI, jenkins...).
# Chạy qua 1 container root tạm để chown, không cần sudo trên host.
docker run --rm -v "${ARTIFACT_DIR}:/artifacts" alpine chown -R "$(id -u):$(id -g)" /artifacts \
    || echo -e "${YELLOW}⚠️  Không chown lại được artifacts/ (bỏ qua)${NC}"

if [ -f "${ARTIFACT_DIR}/results.xml" ]; then
    FAILED_COUNT=$(grep -o '<failure' "${ARTIFACT_DIR}/results.xml" | wc -l)
    if [ "$FAILED_COUNT" -gt 0 ]; then
        TEST_EXIT_CODE=1
    fi
fi

# Lưu trữ chạy TRƯỚC khi báo pass/fail: lần fail mới là lần cần xem lại bằng chứng nhất.
# Mọi lỗi ở đây chỉ cảnh báo, không được nuốt mã thoát của test.
echo -e "\n${YELLOW}📦 Lưu lần chạy vào kho...${NC}"
RUN_DIR="$(archive_run "$ARTIFACT_DIR" "$RUNS_DIR" "$RUN_ID" "$PROJECT_NAME" "$STARTED_AT" "$TEST_EXIT_CODE")" \
    || echo -e "${RED}⚠️  Lưu trữ thất bại${NC}"
prune_old_runs "$RUNS_DIR" "$KEEP_ATTACHMENTS" \
    || echo -e "${RED}⚠️  Tỉa bằng chứng cũ thất bại${NC}"
"${PROJECT_DIR}/build-index.sh" "$RUNS_DIR" > /dev/null \
    || echo -e "${RED}⚠️  Dựng index thất bại${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Tests PASSED${NC}"
else
    echo -e "\n${RED}❌ Tests FAILED (Exit code: $TEST_EXIT_CODE)${NC}"
fi

if [ -f "${RUN_DIR}/results.xml" ]; then
    TOTAL=$(grep -o '<testcase' "${RUN_DIR}/results.xml" | wc -l)
    FAILED=$(grep -o '<failure' "${RUN_DIR}/results.xml" | wc -l)
    PASSED=$((TOTAL - FAILED))
    echo -e "\n${BLUE}=========================================${NC}"
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo -e "  ${GREEN}✅ Passed: $PASSED${NC}"
    echo -e "  ${RED}❌ Failed: $FAILED${NC}"
    echo -e "  📝 Total:  $TOTAL"
fi

# Khởi động server nếu chưa chạy. Không giết server cũ: link team đang mở vẫn sống.
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo -e "\n${GREEN}✅ Report server đang chạy sẵn${NC}"
else
    echo -e "\n${YELLOW}🌐 Khởi động report server...${NC}"
    # 200>&-: đóng fd của .run.lock trước khi exec. report server chạy nền vĩnh
    # viễn qua nohup (cố ý không giết ở lần chạy sau) — nếu không đóng, nó kế
    # thừa fd 200 và giữ flock mãi mãi, khiến MỌI lần chạy script sau treo vô
    # thời hạn chờ lock dù không có lần chạy nào khác thực sự đang diễn ra.
    nohup "$HTTP_SERVER" "$RUNS_DIR" -p "$REPORT_PORT" -c-1 --silent > "$LOG_FILE" 2>&1 200>&- &
    echo $! > "$PID_FILE"
    sleep 2
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo -e "${GREEN}✅ Report server đã chạy${NC}"
    else
        echo -e "${RED}❌ Không khởi động được report server, xem $LOG_FILE${NC}"
    fi
fi

# "hostname -I" trả về IP nội bộ của container Jenkins (vd 172.17.0.2) khi script này
# chạy như một bước "sh" trong Jenkins pipeline, không phải IP LAN thật của host — chỉ
# dùng nó làm fallback cuối cùng. Ưu tiên REPORT_HOST (LAN IP cố định của host, cho phép
# máy khác trong mạng truy cập report), có thể override qua biến môi trường nếu cần.
SERVER_IP="${REPORT_HOST:-192.168.3.101}"
[ -z "$SERVER_IP" ] && SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$SERVER_IP" ] && SERVER_IP="localhost"

echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}✅ Kho lịch sử:${NC}  ${YELLOW}http://${SERVER_IP}:${REPORT_PORT}/${NC}"
echo -e "${GREEN}✅ Lần chạy này:${NC} ${YELLOW}http://${SERVER_IP}:${REPORT_PORT}/${RUN_ID}/${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "\n${BLUE}💡 Lệnh hữu ích:${NC}"
echo -e "  Dừng server:   ${YELLOW}./manage-report.sh stop${NC}"
echo -e "  Trạng thái:    ${YELLOW}./manage-report.sh status${NC}"
echo -e "  Dựng lại index:${YELLOW} ./manage-report.sh reindex${NC}"

echo -e "\n${GREEN}🎉 Done!${NC}\n"

exit $TEST_EXIT_CODE
