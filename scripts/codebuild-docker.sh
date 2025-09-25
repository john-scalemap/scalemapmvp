#!/bin/bash

set -e

AWS_REGION="eu-west-1"
AWS_ACCOUNT_ID="884337373956"
PROJECT_NAME="scalemap-api-build"
SOURCE_DIR="/Users/allieandjohn/Downloads/VisionForge-Main"

echo "Creating CodeBuild project..."

# Create CodeBuild service role if it doesn't exist
ROLE_NAME="scalemap-codebuild-role"
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
  echo "Creating IAM role for CodeBuild..."

  cat > /tmp/codebuild-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "codebuild.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

  ROLE_ARN=$(aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file:///tmp/codebuild-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

  # Attach policies
  aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
  aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

  echo "Waiting for role to be available..."
  sleep 10
fi

echo "Role ARN: $ROLE_ARN"

# Create S3 bucket for CodeBuild artifacts (if needed)
BUCKET_NAME="scalemap-codebuild-artifacts-$AWS_ACCOUNT_ID"
aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION 2>/dev/null || echo "Bucket already exists"

# Create ZIP of source code
echo "Creating source archive..."
cd $SOURCE_DIR
zip -r /tmp/scalemap-source.zip . -x "*.git*" -x "*node_modules*" -x "*.postgres-data*" -x "*dist*" >/dev/null

# Upload to S3
echo "Uploading source to S3..."
aws s3 cp /tmp/scalemap-source.zip s3://$BUCKET_NAME/scalemap-source.zip

# Create or update CodeBuild project
echo "Creating CodeBuild project..."
aws codebuild create-project \
  --name $PROJECT_NAME \
  --source type=S3,location=$BUCKET_NAME/scalemap-source.zip \
  --artifacts type=NO_ARTIFACTS \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true,environmentVariables="[{name=AWS_DEFAULT_REGION,value=$AWS_REGION},{name=AWS_ACCOUNT_ID,value=$AWS_ACCOUNT_ID}]" \
  --service-role $ROLE_ARN \
  --region $AWS_REGION 2>/dev/null || echo "Project already exists, updating..."

# Start build
echo "Starting CodeBuild..."
BUILD_ID=$(aws codebuild start-build \
  --project-name $PROJECT_NAME \
  --region $AWS_REGION \
  --query 'build.id' \
  --output text)

echo "Build started: $BUILD_ID"
echo "Monitor at: https://$AWS_REGION.console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"

# Wait for build to complete
echo "Waiting for build to complete..."
aws codebuild wait build-complete --ids $BUILD_ID --region $AWS_REGION

# Get build status
BUILD_STATUS=$(aws codebuild batch-get-builds \
  --ids $BUILD_ID \
  --region $AWS_REGION \
  --query 'builds[0].buildStatus' \
  --output text)

echo "Build status: $BUILD_STATUS"

if [ "$BUILD_STATUS" = "SUCCEEDED" ]; then
  echo "✅ Docker image built and pushed successfully to ECR!"
  echo "Image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/scalemap-api:v1.0"
else
  echo "❌ Build failed. Check logs at the URL above."
  exit 1
fi