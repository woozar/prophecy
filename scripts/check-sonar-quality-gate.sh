#!/bin/bash
#
# SonarQube Quality Gate Check for Pre-Commit Hook
#
# This script checks:
# 1. If the last SonarQube scan is more recent than the last file modification
# 2. If outdated, automatically runs a new scan
# 3. If the Quality Gate status is passing
#
# Required environment variables (from .env):
#   SONAR_SERVER     - SonarQube server URL (e.g., https://sonar.example.com)
#   SONAR_KEY        - SonarQube project key
#   SONAR_API_TOKEN  - SonarQube API token for authentication
#
# Exit codes:
#   0 - Quality Gate passed
#   1 - Quality Gate failed
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables from .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$' | xargs)
fi

# Validate required environment variables
if [ -z "$SONAR_SERVER" ]; then
  echo "❌ SONAR_SERVER not set - cannot check SonarQube quality gate"
  exit 1
fi

if [ -z "$SONAR_KEY" ]; then
  echo "❌ SONAR_KEY not set - cannot check SonarQube quality gate"
  exit 1
fi

# Use SONAR_API_TOKEN or fall back to SONAR_TOKEN
TOKEN="${SONAR_API_TOKEN:-$SONAR_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "❌ SONAR_API_TOKEN not set - cannot check SonarQube quality gate"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "Checking SonarQube Quality Gate..."

# Get the last analysis date from SonarQube
# API endpoint: /api/project_analyses/search
ANALYSIS_RESPONSE=$(curl -s -u "$TOKEN:" "$SONAR_SERVER/api/project_analyses/search?project=$SONAR_KEY&ps=1" 2>/dev/null)

if [ -z "$ANALYSIS_RESPONSE" ]; then
  echo "❌ Could not connect to SonarQube server - quality gate check failed"
  exit 1
fi

# Check if there are any analyses
ANALYSIS_COUNT=$(echo "$ANALYSIS_RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$ANALYSIS_COUNT" = "0" ]; then
  echo ""
  echo "❌ No SonarQube analysis found for project '$SONAR_KEY'"
  echo ""
  echo "Please run a SonarQube scan first:"
  echo "  ./scripts/sonar-analysis.sh"
  echo ""
  # Exit code 2 indicates "no analysis found" (distinguishable from failure)
  exit 2
fi

# Extract the last analysis date (ISO 8601 format)
LAST_ANALYSIS_DATE=$(echo "$ANALYSIS_RESPONSE" | grep -o '"date":"[^"]*"' | head -1 | sed 's/"date":"//;s/"//')

if [ -z "$LAST_ANALYSIS_DATE" ]; then
  echo "❌ Could not parse SonarQube analysis date - quality gate check failed"
  exit 1
fi

# Convert to Unix timestamp for comparison
# Handle both macOS and Linux date commands
if date --version >/dev/null 2>&1; then
  # GNU date (Linux)
  LAST_ANALYSIS_TIMESTAMP=$(date -d "$LAST_ANALYSIS_DATE" +%s 2>/dev/null || echo "0")
else
  # BSD date (macOS)
  # Convert ISO 8601 UTC time to Unix timestamp
  # The +0000 suffix indicates UTC, so we parse as UTC and output as UTC
  ANALYSIS_DATE_CLEAN=$(echo "$LAST_ANALYSIS_DATE" | sed 's/+0000$//' | sed 's/T/ /')
  LAST_ANALYSIS_TIMESTAMP=$(date -j -u -f "%Y-%m-%d %H:%M:%S" "$ANALYSIS_DATE_CLEAN" +%s 2>/dev/null || echo "0")
fi

# Get the last file modification timestamp
# Uses git ls-files to get files tracked by git (respects .gitignore)
# Then uses stat to get actual file modification times
get_last_file_modification() {
  local max_mtime=0

  # Get all tracked files using git ls-files
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      # Get modification time using stat
      # macOS: stat -f %m
      # Linux: stat -c %Y
      if stat --version >/dev/null 2>&1; then
        # GNU stat (Linux)
        mtime=$(stat -c %Y "$file" 2>/dev/null || echo "0")
      else
        # BSD stat (macOS)
        mtime=$(stat -f %m "$file" 2>/dev/null || echo "0")
      fi

      if [ "$mtime" -gt "$max_mtime" ]; then
        max_mtime=$mtime
      fi
    fi
  done < <(git ls-files 2>/dev/null)

  echo "$max_mtime"
}

LAST_FILE_TIMESTAMP=$(get_last_file_modification)

run_sonar_analysis() {
  echo ""
  echo "Running SonarQube analysis..."
  echo ""
  if [ -x "$SCRIPT_DIR/sonar-analysis.sh" ]; then
    "$SCRIPT_DIR/sonar-analysis.sh"
  else
    echo "❌ sonar-analysis.sh not found or not executable"
    exit 1
  fi
}

if [ "$LAST_ANALYSIS_TIMESTAMP" = "0" ] || [ "$LAST_FILE_TIMESTAMP" = "0" ]; then
  echo "❌ Could not compare timestamps - quality gate check failed"
  exit 1
else
  if [ "$LAST_FILE_TIMESTAMP" -gt "$LAST_ANALYSIS_TIMESTAMP" ]; then
    echo ""
    echo "⚠️  SonarQube scan is outdated!"
    echo ""
    echo "Last analysis:     $(date -r $LAST_ANALYSIS_TIMESTAMP 2>/dev/null || date -d @$LAST_ANALYSIS_TIMESTAMP 2>/dev/null || echo $LAST_ANALYSIS_DATE)"
    echo "Last file change:  $(date -r $LAST_FILE_TIMESTAMP 2>/dev/null || date -d @$LAST_FILE_TIMESTAMP 2>/dev/null)"
    echo ""
    run_sonar_analysis

    # After running analysis, we need to re-fetch the analysis timestamp
    # and re-check the quality gate (handled below)
    echo ""
    echo "Re-checking Quality Gate status after new analysis..."
    sleep 5  # Give SonarQube a moment to process
  fi
fi

# Get the Quality Gate status
QG_RESPONSE=$(curl -s -u "$TOKEN:" "$SONAR_SERVER/api/qualitygates/project_status?projectKey=$SONAR_KEY" 2>/dev/null)

if [ -z "$QG_RESPONSE" ]; then
  echo "❌ Could not fetch Quality Gate status - quality gate check failed"
  exit 1
fi

# Extract the status
QG_STATUS=$(echo "$QG_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//;s/"//')

if [ -z "$QG_STATUS" ]; then
  echo "❌ Could not parse Quality Gate status - quality gate check failed"
  exit 1
fi

if [ "$QG_STATUS" = "OK" ]; then
  echo "✅ SonarQube Quality Gate passed!"
  exit 0
elif [ "$QG_STATUS" = "ERROR" ]; then
  echo ""
  echo "❌ SonarQube Quality Gate FAILED!"
  echo ""
  echo "View details at: $SONAR_SERVER/dashboard?id=$SONAR_KEY"
  echo ""

  # Try to extract and display failed conditions
  FAILED_CONDITIONS=$(echo "$QG_RESPONSE" | grep -o '"status":"ERROR"[^}]*"metricKey":"[^"]*"' | sed 's/.*"metricKey":"//;s/"$//' || echo "")
  if [ -n "$FAILED_CONDITIONS" ]; then
    echo "Failed conditions:"
    echo "$FAILED_CONDITIONS" | while read -r metric; do
      echo "  - $metric"
    done
    echo ""
  fi

  echo "Please fix the issues and run a new SonarQube scan:"
  echo "  ./scripts/sonar-analysis.sh"
  echo ""
  exit 1
else
  echo "❌ Unknown Quality Gate status: $QG_STATUS"
  echo "View details at: $SONAR_SERVER/dashboard?id=$SONAR_KEY"
  exit 1
fi
