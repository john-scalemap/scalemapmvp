#!/bin/bash
# ScaleMap Production Deployment Script
# Based on: docs-consolidated/deployment-guide.md
# Usage: ./scripts/deploy-production.sh

set -e  # Exit on any error

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
export VERSION_TAG="v$(date +%Y%m%d-%H%M%S)"
export ECR_URI="884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api"
export BACKEND_ENDPOINT="http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com"
export AWS_REGION="eu-west-1"
export ECS_CLUSTER_NAME="scalemap-cluster"
export ECS_SERVICE_NAME="ApiService"
export S3_BUCKET="scalemap-frontend-prod-884337373956"
export CLOUDFRONT_DISTRIBUTION_ID="E1OGYBMF9QDMX9"

echo "🚀 Starting ScaleMap production deployment: $VERSION_TAG"
echo "=============================================="

# Pre-deployment checks
echo "1️⃣ Pre-deployment validation..."
cd "$PROJECT_ROOT"

# Check for uncommitted changes
if ! git diff --quiet; then
    echo "❌ Uncommitted changes detected. Commit or stash changes first."
    git status --porcelain
    exit 1
fi

# Run tests
echo "Running tests..."
npm test || {
    echo "❌ Tests failed. Fix tests before deploying."
    exit 1
}

# Build Docker image
echo "2️⃣ Building Docker image with version $VERSION_TAG..."

# Set frontend environment variables
export VITE_API_URL="$BACKEND_ENDPOINT"
export VITE_BUILD_VERSION="$VERSION_TAG"
export VITE_COGNITO_USER_POOL_ID="eu-west-1_iGWQ7N6sH"
export VITE_COGNITO_CLIENT_ID="4oh46v98dsu1c8csu4tn6ddgq1"
export VITE_AWS_REGION="eu-west-1"
export VITE_STRIPE_PUBLIC_KEY="pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA"

docker build \
    --build-arg VITE_API_URL="$VITE_API_URL" \
    --build-arg VITE_BUILD_VERSION="$VITE_BUILD_VERSION" \
    --build-arg VITE_COGNITO_USER_POOL_ID="$VITE_COGNITO_USER_POOL_ID" \
    --build-arg VITE_COGNITO_CLIENT_ID="$VITE_COGNITO_CLIENT_ID" \
    --build-arg VITE_AWS_REGION="$VITE_AWS_REGION" \
    --build-arg VITE_STRIPE_PUBLIC_KEY="$VITE_STRIPE_PUBLIC_KEY" \
    -t scalemap-api:$VERSION_TAG \
    -t scalemap-api:latest \
    -f server/Dockerfile .

# Verify build configuration
echo "3️⃣ Verifying build configuration..."
docker run --rm scalemap-api:$VERSION_TAG \
    sh -c "grep -q '$BACKEND_ENDPOINT' /app/dist/public/assets/*.js && echo '✅ Correct API endpoint' || (echo '❌ Wrong API endpoint' && exit 1)"

# Push to ECR
echo "4️⃣ Pushing to ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_URI

docker tag scalemap-api:$VERSION_TAG $ECR_URI:$VERSION_TAG
docker tag scalemap-api:latest $ECR_URI:latest
docker push $ECR_URI:$VERSION_TAG
docker push $ECR_URI:latest

# Deploy backend
echo "5️⃣ Deploying backend to ECS..."
aws ecs update-service \
    --cluster $ECS_CLUSTER_NAME \
    --service $ECS_SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION

echo "⏳ Waiting for backend deployment to start..."
sleep 30

# Deploy frontend
echo "6️⃣ Deploying frontend..."
docker create --name frontend-temp $ECR_URI:$VERSION_TAG
docker cp frontend-temp:/app/dist/public ./frontend-dist
docker rm frontend-temp

# Add version metadata
echo "$VERSION_TAG" > ./frontend-dist/version.txt
echo "Backend: $ECR_URI:$VERSION_TAG" >> ./frontend-dist/version.txt
echo "Deployed: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> ./frontend-dist/version.txt

# Upload to S3
aws s3 sync ./frontend-dist s3://$S3_BUCKET/ \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "*.html" \
    --exclude "version.txt"

aws s3 sync ./frontend-dist s3://$S3_BUCKET/ \
    --cache-control "public,max-age=60,must-revalidate" \
    --exclude "*" \
    --include "*.html" \
    --include "version.txt"

# Invalidate CloudFront
echo "7️⃣ Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*.html" "/index.html" "/" "/version.txt" \
    --query 'Invalidation.Id' \
    --output text)

echo "CloudFront invalidation: $INVALIDATION_ID"

# Wait for backend deployment
echo "8️⃣ Waiting for backend deployment to complete..."
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER_NAME \
    --services $ECS_SERVICE_NAME \
    --region $AWS_REGION

# Verification
echo "9️⃣ Verifying deployment..."

# Backend health check
sleep 10
if curl -f "$BACKEND_ENDPOINT/health"; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Wait for CloudFront invalidation
echo "⏳ Waiting for CloudFront invalidation to complete..."
aws cloudfront wait invalidation-completed \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --id $INVALIDATION_ID

# Frontend version check
sleep 5
DEPLOYED_VERSION=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt | head -1)
if [ "$DEPLOYED_VERSION" = "$VERSION_TAG" ]; then
    echo "✅ Frontend version matches: $DEPLOYED_VERSION"
else
    echo "❌ Frontend version mismatch. Expected: $VERSION_TAG, Got: $DEPLOYED_VERSION"
    exit 1
fi

# Clean up
rm -rf ./frontend-dist

echo "🎉 Deployment successful!"
echo "========================"
echo "Version: $VERSION_TAG"
echo "Backend: $ECR_URI:$VERSION_TAG"
echo "Frontend: https://d2nr28qnjfjgb5.cloudfront.net"
echo "Health: $BACKEND_ENDPOINT/health"
echo "Version info: https://d2nr28qnjfjgb5.cloudfront.net/version.txt"
echo ""
echo "🔍 Next steps:"
echo "1. Test the application end-to-end"
echo "2. Update docs-consolidated/current-state.md with this deployment"
echo "3. Monitor CloudWatch logs for any issues"