#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 KeePass Desktop Launcher${NC}"
echo "================================"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Error: Go is not installed${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    exit 1
fi

# Start backend in background
echo -e "${GREEN}🚀 Starting KeePass Desktop...${NC}"
echo -e "${YELLOW}Backend will run on: http://localhost:9080${NC}"
echo -e "${YELLOW}Frontend will run on: http://localhost:1420${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}Starting backend in background...${NC}"
./scripts/start-backend.sh > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start (up to 10 seconds)
echo -e "${YELLOW}Waiting for backend to start...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:9080/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running on http://localhost:9080${NC}"
        break
    fi
    
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Backend failed to start after 10 seconds${NC}"
        echo -e "${YELLOW}Backend logs:${NC}"
        cat backend.log
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    echo -e "${YELLOW}Waiting... (${i}/10)${NC}"
    sleep 1
done

# Start frontend (Tauri)
echo -e "${BLUE}Starting frontend (Tauri)...${NC}"
npm run tauri dev

# Cleanup: kill backend when frontend exits
echo -e "${YELLOW}Shutting down backend...${NC}"
kill $BACKEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null
rm -f backend.log 