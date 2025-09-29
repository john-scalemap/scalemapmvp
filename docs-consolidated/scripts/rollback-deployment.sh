#!/bin/bash
# ScaleMap Emergency Rollback Script
# Usage: ./scripts/rollback-deployment.sh [version-tag]

# Configuration
export AWS_REGION="eu-west-1"
export ECS_CLUSTER_NAME="scalemap-cluster"
export ECS_SERVICE_NAME="ApiService"
export ECR_URI="884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api"
export S3_BUCKET="scalemap-frontend-prod-884337373956"
export CLOUDFRONT_DISTRIBUTION_ID="E1OGYBMF9QDMX9"

TARGET_VERSION="$1"

echo "🔄 ScaleMap Emergency Rollback"
echo "==============================="

if [ -z "$TARGET_VERSION" ]; then
    echo "Usage: $0 <version-tag>"
    echo ""
    echo "Available versions:"
    aws ecr describe-images \
        --repository-name scalemap-api \
        --region $AWS_REGION \
        --query 'imageDetails[*].imageTags[0]' \
        --output table 2>/dev/null || echo "❌ Failed to list versions (check AWS credentials)"
    exit 1
fi

echo "Rolling back to version: $TARGET_VERSION"
echo "Timestamp: $(date)"
echo ""

# Confirm rollback
read -p "⚠️ This will rollback both frontend and backend. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled"
    exit 1
fi

echo "🔄 Starting rollback process..."

# Step 1: Find task definition with target version
echo "1️⃣ Finding task definition for version $TARGET_VERSION..."

TARGET_IMAGE="$ECR_URI:$TARGET_VERSION"

# Check if image exists
if ! aws ecr describe-images \
    --repository-name scalemap-api \
    --image-ids imageTag=$TARGET_VERSION \
    --region $AWS_REGION > /dev/null 2>&1; then
    echo "❌ Image $TARGET_IMAGE not found in ECR"
    exit 1
fi

# Find task definition with the target image
TASK_DEF_ARN=""
for arn in $(aws ecs list-task-definitions \
    --family-prefix scalemap-api \
    --status ACTIVE \
    --region $AWS_REGION \
    --query 'taskDefinitionArns[]' \
    --output text); do

    IMAGE=$(aws ecs describe-task-definition \
        --task-definition "$arn" \
        --region $AWS_REGION \
        --query 'taskDefinition.containerDefinitions[0].image' \
        --output text 2>/dev/null)

    if [ "$IMAGE" = "$TARGET_IMAGE" ]; then
        TASK_DEF_ARN="$arn"
        break
    fi
done

if [ -z "$TASK_DEF_ARN" ]; then
    echo "❌ No task definition found for image $TARGET_IMAGE"
    echo "Creating new task definition from existing template..."

    # Get current task definition and update the image
    CURRENT_TASK_DEF=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER_NAME \
        --services $ECS_SERVICE_NAME \
        --region $AWS_REGION \
        --query 'services[0].taskDefinition' \
        --output text)

    # Create new task definition with target image
    aws ecs describe-task-definition \
        --task-definition "$CURRENT_TASK_DEF" \
        --region $AWS_REGION \
        --query 'taskDefinition' > /tmp/task-def.json

    # Update image in task definition
    jq --arg image "$TARGET_IMAGE" \
        '.containerDefinitions[0].image = $image | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)' \
        /tmp/task-def.json > /tmp/task-def-updated.json

    # Register new task definition
    TASK_DEF_ARN=$(aws ecs register-task-definition \
        --cli-input-json file:///tmp/task-def-updated.json \
        --region $AWS_REGION \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)

    rm -f /tmp/task-def.json /tmp/task-def-updated.json
fi

echo "✅ Using task definition: $TASK_DEF_ARN"

# Step 2: Rollback backend
echo "2️⃣ Rolling back backend to $TARGET_VERSION..."

aws ecs update-service \
    --cluster $ECS_CLUSTER_NAME \
    --service $ECS_SERVICE_NAME \
    --task-definition "$TASK_DEF_ARN" \
    --region $AWS_REGION

echo "⏳ Waiting for backend rollback to start..."
sleep 15

# Step 3: Extract and deploy old frontend
echo "3️⃣ Rolling back frontend..."

# Pull the target image
docker pull $TARGET_IMAGE

# Extract frontend from the target version
docker create --name rollback-temp $TARGET_IMAGE
docker cp rollback-temp:/app/dist/public ./rollback-frontend
docker rm rollback-temp

# Verify frontend extraction
if [ ! -d "./rollback-frontend" ] || [ -z "$(ls -A ./rollback-frontend)" ]; then
    echo "❌ Failed to extract frontend from $TARGET_IMAGE"
    exit 1
fi

echo "✅ Frontend extracted from $TARGET_IMAGE"

# Step 4: Deploy old frontend to S3
echo "4️⃣ Deploying rollback frontend to S3..."

# Upload static assets with long cache
aws s3 sync ./rollback-frontend s3://$S3_BUCKET/ \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "*.html" \
    --exclude "version.txt"

# Upload HTML and version files with short cache
aws s3 sync ./rollback-frontend s3://$S3_BUCKET/ \
    --cache-control "public,max-age=60,must-revalidate" \
    --exclude "*" \
    --include "*.html" \
    --include "version.txt"

# Step 5: Invalidate CloudFront cache
echo "5️⃣ Invalidating CloudFront cache..."

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "CloudFront invalidation: $INVALIDATION_ID"

# Step 6: Wait for backend rollback completion
echo "6️⃣ Waiting for backend rollback to complete..."

aws ecs wait services-stable \
    --cluster $ECS_CLUSTER_NAME \
    --services $ECS_SERVICE_NAME \
    --region $AWS_REGION

echo "✅ Backend rollback completed"

# Step 7: Wait for cache invalidation
echo "7️⃣ Waiting for cache invalidation to complete..."

aws cloudfront wait invalidation-completed \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --id $INVALIDATION_ID

echo "✅ Cache invalidation completed"

# Step 8: Verification
echo "8️⃣ Verifying rollback..."

# Backend health check
echo "Checking backend health..."
sleep 10
if curl -s -f "http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/health" > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
fi

# Frontend version check
echo "Checking frontend version..."
sleep 5
DEPLOYED_VERSION=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt 2>/dev/null | head -1)
echo "Deployed frontend version: ${DEPLOYED_VERSION:-Unknown}"

# Verify backend image
CURRENT_IMAGE=$(aws ecs describe-task-definition \
    --task-definition $(aws ecs describe-services \
        --cluster $ECS_CLUSTER_NAME \
        --services $ECS_SERVICE_NAME \
        --region $AWS_REGION \
        --query 'services[0].taskDefinition' \
        --output text) \
    --region $AWS_REGION \
    --query 'taskDefinition.containerDefinitions[0].image' \
    --output text 2>/dev/null)

if [ "$CURRENT_IMAGE" = "$TARGET_IMAGE" ]; then
    echo "✅ Backend rollback verified: $CURRENT_IMAGE"
else
    echo "❌ Backend rollback verification failed"
    echo "   Expected: $TARGET_IMAGE"
    echo "   Current: $CURRENT_IMAGE"
fi

# Clean up
rm -rf ./rollback-frontend

echo ""
echo "🎉 Rollback completed!"
echo "====================="
echo "Target Version: $TARGET_VERSION"
echo "Backend Image: $TARGET_IMAGE"
echo "Frontend: https://d2nr28qnjfjgb5.cloudfront.net"
echo "Rollback Time: $(date)"
echo ""
echo "📋 Post-rollback actions:"
echo "1. Test the application thoroughly"
echo "2. Update docs-consolidated/current-state.md"
echo "3. Document the rollback reason"
echo "4. Monitor system for stability"
echo "5. Plan fix for the issue that caused rollback"

# Log rollback
echo "$(date): Rollback to $TARGET_VERSION completed" >> rollback.log