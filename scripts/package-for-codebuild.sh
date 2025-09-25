#!/bin/bash

# Script to create clean source package for AWS CodeBuild
# Excludes large directories that bloat the ZIP file

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/build-artifacts"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="${OUTPUT_DIR}/scalemap-source-${TIMESTAMP}.zip"

echo "📦 Creating clean source package for CodeBuild..."
echo "Project root: ${PROJECT_ROOT}"

mkdir -p "${OUTPUT_DIR}"

cd "${PROJECT_ROOT}"

echo "🗂️  Files to include:"
echo "  - server/ (source code only)"
echo "  - client/ (source code only)"
echo "  - shared/"
echo "  - infrastructure/"
echo "  - package*.json files"
echo "  - buildspec.yml"
echo ""
echo "❌ Excluding:"
echo "  - node_modules/"
echo "  - .postgres-data/"
echo "  - attached_assets/"
echo "  - dist/ and build/ directories"
echo "  - .git/"
echo "  - coverage/ and test artifacts"
echo ""

zip -r "${OUTPUT_FILE}" \
  server \
  client \
  shared \
  infrastructure \
  package.json \
  package-lock.json \
  buildspec.yml \
  tsconfig.json \
  -x "*/node_modules/*" \
  -x "*/.postgres-data/*" \
  -x "*/attached_assets/*" \
  -x "*/dist/*" \
  -x "*/build/*" \
  -x "*/.git/*" \
  -x "*/coverage/*" \
  -x "*/.env*" \
  -x "*.test.ts" \
  -x "*/.DS_Store" \
  -x "*/build-artifacts/*"

SIZE=$(du -h "${OUTPUT_FILE}" | cut -f1)
echo ""
echo "✅ Source package created: ${OUTPUT_FILE}"
echo "📊 Package size: ${SIZE}"
echo ""
echo "Next steps:"
echo "1. Upload to S3: aws s3 cp ${OUTPUT_FILE} s3://scalemap-codebuild-artifacts-884337373956/source.zip"
echo "2. Trigger build: aws codebuild start-build --project-name scalemap-api-build"