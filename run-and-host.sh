#!/bin/bash

#####################################################
# E2E Test Runner with Auto Report Hosting
# Chạy test và tự động host report trên port 9323
#####################################################

# Cấu hình
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_PORT=9323
CONTAINER_NAME="playwright-report-server"
IMAGE_NAME="haido2402/e2e-playwright-e2e:latest"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🚀 E2E Test Runner & Report Host${NC}"
echo -e "${BLUE}=========================================${NC}"

cd "$PROJECT_DIR"

# Bước 1: Pull latest image
echo -e "\n${YELLOW}📥 Pulling latest Docker image...${NC}"
docker pull "$IMAGE_NAME"

# Bước 2: Stop và remove report server cũ nếu đang chạy
echo -e "\n${YELLOW}🛑 Stopping old report server (if exists)...${NC}"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Bước 3: Chạy E2E tests
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}🧪 Running E2E Tests${NC}"
echo -e "${BLUE}=========================================${NC}"

docker run --rm \
  --env-file .env \
  -v "${PROJECT_DIR}/artifacts:/artifacts" \
  -v "${PROJECT_DIR}/tests:/runner/tests" \
  -v "${PROJECT_DIR}/playwright.config.ts:/runner/playwright.config.ts" \
  "$IMAGE_NAME" --project=tpa-chrome

TEST_EXIT_CODE=$?

# Bước 4: Kiểm tra kết quả test
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Tests PASSED${NC}"
else
    echo -e "\n${RED}❌ Tests FAILED (Exit code: $TEST_EXIT_CODE)${NC}"
fi

# Bước 5: Kiểm tra report có tồn tại không
REPORT_DIR="${PROJECT_DIR}/artifacts/playwright-report"
if [ ! -d "$REPORT_DIR" ] || [ ! -f "$REPORT_DIR/index.html" ]; then
    echo -e "${RED}❌ Report not found at $REPORT_DIR${NC}"
    exit 1
fi

# Bước 6: Host report với Nginx container
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}🌐 Starting Report Server${NC}"
echo -e "${BLUE}=========================================${NC}"

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$REPORT_PORT:80" \
  -v "${REPORT_DIR}:/usr/share/nginx/html:ro" \
  --restart unless-stopped \
  nginx:alpine

# Đợi server start
sleep 2

# Kiểm tra container đã chạy chưa
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${GREEN}✅ Report server started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start report server${NC}"
    exit 1
fi

# Bước 7: Parse test results (optional)
if [ -f "${PROJECT_DIR}/artifacts/results.xml" ]; then
    TOTAL=$(grep -o '<testcase' "${PROJECT_DIR}/artifacts/results.xml" | wc -l)
    FAILED=$(grep -o '<failure' "${PROJECT_DIR}/artifacts/results.xml" | wc -l)
    PASSED=$((TOTAL - FAILED))
    
    echo -e "\n${BLUE}=========================================${NC}"
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo -e "  ${GREEN}✅ Passed: $PASSED${NC}"
    echo -e "  ${RED}❌ Failed: $FAILED${NC}"
    echo -e "  📝 Total:  $TOTAL"
fi

# Bước 8: Hiển thị thông tin truy cập
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
fi
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}✅ Report is now available at:${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "  🌐 ${YELLOW}http://${SERVER_IP}:${REPORT_PORT}${NC}"
echo -e "${BLUE}=========================================${NC}"

# Bước 9: Hiển thị commands để quản lý
echo -e "\n${BLUE}💡 Useful commands:${NC}"
echo -e "  Stop server:    ${YELLOW}docker stop $CONTAINER_NAME${NC}"
echo -e "  Start server:   ${YELLOW}docker start $CONTAINER_NAME${NC}"
echo -e "  Restart server: ${YELLOW}docker restart $CONTAINER_NAME${NC}"
echo -e "  View logs:      ${YELLOW}docker logs -f $CONTAINER_NAME${NC}"
echo -e "  Remove server:  ${YELLOW}docker rm -f $CONTAINER_NAME${NC}"

echo -e "\n${GREEN}🎉 Done!${NC}\n"

exit $TEST_EXIT_CODE
