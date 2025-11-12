#!/bin/bash

#####################################################
# Report Server Management Script
# Quản lý report server độc lập
#####################################################

REPORT_PORT=9323
CONTAINER_NAME="playwright-report-server"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_DIR="${PROJECT_DIR}/artifacts/playwright-report"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo -e "  $0 start      - Start report server"
    echo -e "  $0 stop       - Stop report server"
    echo -e "  $0 restart    - Restart report server"
    echo -e "  $0 status     - Show server status"
    echo -e "  $0 logs       - Show server logs"
    echo -e "  $0 url        - Show report URL"
}

start_server() {
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${YELLOW}⚠️  Report server is already running${NC}"
        show_url
        return 0
    fi

    if [ ! -d "$REPORT_DIR" ]; then
        echo -e "${RED}❌ Report directory not found: $REPORT_DIR${NC}"
        echo -e "${YELLOW}💡 Run tests first to generate report${NC}"
        return 1
    fi

    echo -e "${BLUE}🌐 Starting report server...${NC}"
    
    # Remove old stopped container if exists
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    
    docker run -d \
      --name "$CONTAINER_NAME" \
      -p "$REPORT_PORT:80" \
      -v "${REPORT_DIR}:/usr/share/nginx/html:ro" \
      --restart unless-stopped \
      nginx:alpine

    sleep 2

    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${GREEN}✅ Report server started successfully${NC}"
        show_url
    else
        echo -e "${RED}❌ Failed to start report server${NC}"
        return 1
    fi
}

stop_server() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${YELLOW}⚠️  Report server is not running${NC}"
        return 0
    fi

    echo -e "${BLUE}🛑 Stopping report server...${NC}"
    docker stop "$CONTAINER_NAME"
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    echo -e "${GREEN}✅ Report server stopped${NC}"
}

restart_server() {
    echo -e "${BLUE}🔄 Restarting report server...${NC}"
    stop_server
    sleep 1
    start_server
}

show_status() {
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${GREEN}✅ Report server is RUNNING${NC}"
        docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        show_url
    elif docker ps -a | grep -q "$CONTAINER_NAME"; then
        echo -e "${YELLOW}⚠️  Report server is STOPPED${NC}"
        docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}"
    else
        echo -e "${RED}❌ Report server does not exist${NC}"
    fi
}

show_logs() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${RED}❌ Report server is not running${NC}"
        return 1
    fi

    echo -e "${BLUE}📋 Showing logs (Ctrl+C to exit):${NC}"
    docker logs -f "$CONTAINER_NAME"
}

show_url() {
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
    fi
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi

    echo -e "\n${BLUE}=========================================${NC}"
    echo -e "${GREEN}🌐 Report URL:${NC}"
    echo -e "  ${YELLOW}http://${SERVER_IP}:${REPORT_PORT}${NC}"
    echo -e "  ${YELLOW}http://localhost:${REPORT_PORT}${NC}"
    echo -e "${BLUE}=========================================${NC}"
}

# Main
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    url)
        show_url
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
