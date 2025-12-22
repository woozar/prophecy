#!/bin/bash
#
# SonarQube Analysis Script for Paperless AI NGX
#
# Required environment variables (from .env):
#   SONAR_SERVER     - SonarQube server URL (e.g., https://sonar.example.com)
#   SONAR_KEY        - SonarQube project key
#   SONAR_TOKEN      - SonarQube authentication token
#
# Optional:
#   SONAR_API_TOKEN  - Alternative API token for SonarQube
#
# Usage:
#   ./scripts/sonar-analysis.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables from .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "Loading environment variables from .env..."
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Validate required environment variables
if [ -z "$SONAR_SERVER" ]; then
  echo "Error: SONAR_SERVER environment variable is not set"
  exit 1
fi

if [ -z "$SONAR_KEY" ]; then
  echo "Error: SONAR_KEY environment variable is not set"
  exit 1
fi

# Use SONAR_TOKEN or fall back to SONAR_API_TOKEN
TOKEN="${SONAR_TOKEN:-$SONAR_API_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "Error: Neither SONAR_TOKEN nor SONAR_API_TOKEN is set"
  exit 1
fi

cd "$PROJECT_ROOT"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "========================================"
echo "SonarQube Analysis"
echo "========================================"
echo "Server: $SONAR_SERVER"
echo "Project: $SONAR_KEY"
echo "Version: $VERSION"
echo "========================================"

# Check if sonar-scanner is installed
if command -v sonar-scanner &> /dev/null; then
  SCANNER="sonar-scanner"
elif command -v sonar &> /dev/null; then
  SCANNER="sonar"
else
  echo "sonar-scanner not found. Using npx @sonar/scan..."
  SCANNER="npx --yes @sonar/scan"
fi

# Run tests with coverage first
echo ""
echo "Running tests with coverage..."
npm run test:coverage || echo "Warning: Tests failed or coverage not available"

# Run sonar-scanner (uses sonar-project.properties for static config)
echo ""
echo "Running SonarQube analysis..."
$SCANNER \
  -Dsonar.host.url="$SONAR_SERVER" \
  -Dsonar.projectKey="$SONAR_KEY" \
  -Dsonar.projectVersion="$VERSION" \
  -Dsonar.token="$TOKEN"

echo ""
echo "========================================"
echo "SonarQube analysis complete!"
echo "View results at: $SONAR_SERVER/dashboard?id=$SONAR_KEY"
echo "========================================"
