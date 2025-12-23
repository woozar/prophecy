#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Configuration
REGISTRY="registry.12-of-spades.com"
IMAGE_NAME="prophezeiung"
PLATFORM="linux/amd64"

# Load environment variables from .env
if [ -f .env ]; then
    export $(grep -E '^REGISTRY_' .env | xargs)
fi

# Parse arguments
PUSH=false
LOCAL=false
TAG="latest"
for arg in "$@"; do
    case $arg in
        --push)
            PUSH=true
            ;;
        --local)
            LOCAL=true
            PLATFORM="linux/arm64"
            ;;
        --tag=*)
            TAG="${arg#*=}"
            ;;
        *)
            # Non-flag argument is treated as tag
            if [[ ! "$arg" == --* ]]; then
                TAG="$arg"
            fi
            ;;
    esac
done

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

printf "${YELLOW}========================================${NC}\n"
printf "${YELLOW}  Prophezeiung Docker Build${NC}\n"
printf "${YELLOW}========================================${NC}\n"
printf "\n"
printf "${BLUE}Image:${NC} ${FULL_IMAGE}\n"
printf "${BLUE}Platform:${NC} ${PLATFORM}\n"
printf "\n"

# Build the image
printf "${YELLOW}Building image...${NC}\n"
docker build --platform "$PLATFORM" -t "$FULL_IMAGE" -t "${IMAGE_NAME}:${TAG}" .

if [ $? -ne 0 ]; then
    printf "${RED}Build failed!${NC}\n"
    exit 1
fi

printf "${GREEN}Build successful!${NC}\n"

# Push if requested
if [ "$PUSH" = true ]; then
    # Check for required credentials
    if [ -z "$REGISTRY_USER" ] || [ -z "$REGISTRY_PASSWORD" ]; then
        printf "${RED}Error: REGISTRY_USER and REGISTRY_PASSWORD must be set in .env${NC}\n"
        exit 1
    fi

    printf "${YELLOW}Logging into registry...${NC}\n"
    echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY" -u "$REGISTRY_USER" --password-stdin
    printf "${GREEN}Login successful${NC}\n"

    printf "${YELLOW}Pushing image...${NC}\n"
    docker push "$FULL_IMAGE"

    if [ $? -eq 0 ]; then
        printf "\n"
        printf "${GREEN}========================================${NC}\n"
        printf "${GREEN}  Build and push successful!${NC}\n"
        printf "${GREEN}========================================${NC}\n"
        printf "\n"
        printf "${BLUE}Image pushed to:${NC} ${FULL_IMAGE}\n"
        printf "\n"
        printf "To pull and run:\n"
        printf "  docker pull ${FULL_IMAGE}\n"
        printf "  docker run -p 3000:3000 -e DATABASE_URL=<your-db-url> ${FULL_IMAGE}\n"
    else
        printf "${RED}Push failed!${NC}\n"
        exit 1
    fi
else
    printf "\n"
    printf "To run the application:\n"
    printf "  docker compose up -d\n"
    printf "\n"
    printf "To push to registry, run:\n"
    printf "  ./scripts/docker-build.sh --push\n"
fi
