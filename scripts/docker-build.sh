#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building Prophezeiung Docker image...${NC}"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Build the Docker image
docker build -t prophezeiung:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Build successful!${NC}"
    echo ""
    echo "To run the application:"
    echo "  docker compose up -d"
    echo ""
    echo "To run only the app (with external database):"
    echo "  docker run -p 3000:3000 -e DATABASE_URL=<your-db-url> prophezeiung:latest"
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
