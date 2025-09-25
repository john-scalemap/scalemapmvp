#!/bin/bash

set -e

echo "Creating smart minimal package for CSS fix deployment..."

# Create temp directory for minimal package
TEMP_DIR="/tmp/scalemap-minimal-$(date +%s)"
mkdir -p $TEMP_DIR

# Copy only the essential files for the CSS fix
echo "Copying minimal essential files..."

# Root files needed for build
cp package.json $TEMP_DIR/
cp package-lock.json $TEMP_DIR/
cp tsconfig.json $TEMP_DIR/
cp vite.config.ts $TEMP_DIR/
cp tailwind.config.ts $TEMP_DIR/
cp postcss.config.js $TEMP_DIR/
cp buildspec.yml $TEMP_DIR/

# Server directory (with updated Dockerfile and vite.ts)
mkdir -p $TEMP_DIR/server
cp -r server/ $TEMP_DIR/server/

# Client directory (needed for build)
mkdir -p $TEMP_DIR/client
cp -r client/ $TEMP_DIR/client/

# Shared directory
mkdir -p $TEMP_DIR/shared
cp -r shared/ $TEMP_DIR/shared/

echo "Package contents:"
find $TEMP_DIR -type f | wc -l | xargs echo "Files:"
du -sh $TEMP_DIR

# Create zip
cd $TEMP_DIR
zip -r /tmp/scalemap-minimal.zip . -x "*.git*" -x "*node_modules*" -x "*.postgres-data*" -x "*dist*" -x "*build-artifacts*" >/dev/null

echo "Minimal package created:"
ls -lh /tmp/scalemap-minimal.zip

# Upload to S3 and trigger CodeBuild
AWS_REGION="eu-west-1"
AWS_ACCOUNT_ID="884337373956"
PROJECT_NAME="scalemap-api-build"
BUCKET_NAME="scalemap-codebuild-artifacts-$AWS_ACCOUNT_ID"

echo "Uploading minimal package to S3..."
aws s3 cp /tmp/scalemap-minimal.zip s3://$BUCKET_NAME/scalemap-source.zip

# Start build
echo "Starting CodeBuild..."
BUILD_ID=$(aws codebuild start-build \
  --project-name $PROJECT_NAME \
  --region $AWS_REGION \
  --query 'build.id' \
  --output text)

echo "Build started: $BUILD_ID"
echo "Monitor: https://$AWS_REGION.console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"

# Cleanup
rm -rf $TEMP_DIR
rm /tmp/scalemap-minimal.zip

echo "✅ CSS fix deployment initiated with minimal package!"