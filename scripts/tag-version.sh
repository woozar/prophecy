#!/bin/bash

# Creates git tags for all past versions from package.json history
# Only tags versions that have been superseded by a newer version
# Usage: ./scripts/tag-version.sh [--push]

set -e

PUSH_FLAG=""
if [ "$1" = "--push" ]; then
  PUSH_FLAG="--push"
fi

# Get current version (don't tag this one)
CURRENT_VERSION=$(grep -m1 '"version"' package.json | sed 's/.*"\([0-9.]*\)".*/\1/')
echo "Current version: $CURRENT_VERSION (will not be tagged)"

# Get all commits that modified package.json
COMMITS=$(git log --format="%H" --follow -- package.json)

TAGS_CREATED=0
LAST_VERSION=""

for COMMIT in $COMMITS; do
  VERSION=$(git show "$COMMIT:package.json" 2>/dev/null | grep -m1 '"version"' | sed 's/.*"\([0-9.]*\)".*/\1/')

  # Skip if same as last version we processed
  if [ "$VERSION" = "$LAST_VERSION" ]; then
    continue
  fi

  LAST_VERSION="$VERSION"
  # Skip current version
  if [ "$VERSION" = "$CURRENT_VERSION" ]; then
    continue
  fi

  TAG="v$VERSION"
  SHORT_COMMIT=$(git rev-parse --short "$COMMIT")

  # Check if tag already exists
  if git tag -l "$TAG" | grep -q "$TAG"; then
    continue
  fi

  # Create the tag
  echo "Creating tag $TAG on $SHORT_COMMIT..."
  git tag "$TAG" "$COMMIT"
  TAGS_CREATED=$((TAGS_CREATED + 1))
done

if [ $TAGS_CREATED -eq 0 ]; then
  echo "No new tags to create."
  exit 0
fi

echo ""
echo "$TAGS_CREATED tag(s) created."

if [ -n "$PUSH_FLAG" ]; then
  echo "Pushing tags to origin..."
  git push origin --tags
  echo "Done!"
else
  echo "Run 'git push origin --tags' to push, or use --push flag."
fi
