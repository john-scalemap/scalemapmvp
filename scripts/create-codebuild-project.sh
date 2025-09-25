#!/bin/bash

# CodeBuild Project Creation Script for ScaleMap API Docker Build

set -e

# Configuration
PROJECT_NAME="scalemap-api-docker-build"
REGION="eu-west-1"
ACCOUNT_ID="884337373956"
SOURCE_BUCKET="scalemap-codebuild-source-${ACCOUNT_ID}"

echo "Creating CodeBuild project: ${PROJECT_NAME}"

# Create S3 bucket for source if it doesn't exist
aws s3 mb s3://${SOURCE_BUCKET} --region ${REGION} 2>/dev/null || echo "Bucket already exists"

# Create IAM role for CodeBuild
cat > /tmp/codebuild-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create or update the IAM role
aws iam create-role \
  --role-name ${PROJECT_NAME}-role \
  --assume-role-policy-document file:///tmp/codebuild-trust-policy.json \
  --region ${REGION} 2>/dev/null || echo "Role already exists"

# Create IAM policy for CodeBuild
cat > /tmp/codebuild-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Resource": [
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/codebuild/${PROJECT_NAME}",
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/codebuild/${PROJECT_NAME}:*"
      ],
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
    },
    {
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::${SOURCE_BUCKET}/*"
      ],
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:PutObject"
      ]
    },
    {
      "Effect": "Allow",
      "Resource": [
        "arn:aws:ecr:${REGION}:${ACCOUNT_ID}:repository/scalemap-api"
      ],
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ]
    },
    {
      "Effect": "Allow",
      "Resource": "*",
      "Action": [
        "ecr:GetAuthorizationToken"
      ]
    }
  ]
}
EOF

# Attach policy to role
aws iam put-role-policy \
  --role-name ${PROJECT_NAME}-role \
  --policy-name ${PROJECT_NAME}-policy \
  --policy-document file:///tmp/codebuild-policy.json \
  --region ${REGION}

# Wait for role to propagate
sleep 5

# Create CodeBuild project
aws codebuild create-project \
  --name ${PROJECT_NAME} \
  --source type=S3,location=${SOURCE_BUCKET}/source.zip \
  --artifacts type=NO_ARTIFACTS \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true \
  --service-role arn:aws:iam::${ACCOUNT_ID}:role/${PROJECT_NAME}-role \
  --region ${REGION} 2>/dev/null || echo "Project already exists, updating..."

# Update project if it already exists
aws codebuild update-project \
  --name ${PROJECT_NAME} \
  --source type=S3,location=${SOURCE_BUCKET}/source.zip \
  --artifacts type=NO_ARTIFACTS \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true \
  --service-role arn:aws:iam::${ACCOUNT_ID}:role/${PROJECT_NAME}-role \
  --region ${REGION}

echo "CodeBuild project '${PROJECT_NAME}' created/updated successfully"
echo "Source bucket: s3://${SOURCE_BUCKET}"