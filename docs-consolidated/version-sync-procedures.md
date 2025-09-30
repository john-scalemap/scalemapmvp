# Frontend/Backend Version Synchronization Procedures

**Status:** Authoritative
**Last Updated:** 2025-09-29
**Purpose:** Eliminate frontend/backend version mismatches and ensure correct endpoint references

## 🎯 **Core Problem: Version Drift**

**Issue:** Frontend and backend deployments are independent, causing:
- Frontend pointing to old backend endpoints
- New frontend features calling non-existent backend endpoints
- Cached frontend connecting to updated backend with breaking changes
- Environment variable mismatches between build and runtime

---

## 1. **Current Version Tracking**

### **Check Current Deployed Versions**
```bash
# Backend version (from ECS task definition)
export CURRENT_BACKEND=$(aws ecs describe-task-definition \
  --task-definition $(aws ecs describe-services \
    --cluster scalemap-cluster \
    --services ApiService \
    --region eu-west-1 \
    --query 'services[0].taskDefinition' \
    --output text) \
  --region eu-west-1 \
  --query 'taskDefinition.containerDefinitions[0].image' \
  --output text)

echo "Current Backend: $CURRENT_BACKEND"

# Frontend version (check build metadata)
export CURRENT_FRONTEND=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/ | \
  grep -o 'data-build-version="[^"]*"' | \
  cut -d'"' -f2)

echo "Current Frontend: $CURRENT_FRONTEND"

# API endpoint that frontend is configured to use
export FRONTEND_API_ENDPOINT=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/index-*.js | \
  grep -o 'http://[^"]*elb\.amazonaws\.com' | head -1)

echo "Frontend API Endpoint: $FRONTEND_API_ENDPOINT"

# Actual backend endpoint
export BACKEND_ENDPOINT="https://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com"

echo "Actual Backend Endpoint: $BACKEND_ENDPOINT"
```

### **Version Mismatch Detection**
```bash
#!/bin/bash
# version-check.sh - Detect version mismatches

detect_mismatch() {
    echo "🔍 Checking for version mismatches..."

    # Check if frontend API endpoint matches actual backend
    if [ "$FRONTEND_API_ENDPOINT" != "$BACKEND_ENDPOINT" ]; then
        echo "❌ MISMATCH: Frontend API endpoint doesn't match backend"
        echo "   Frontend expects: $FRONTEND_API_ENDPOINT"
        echo "   Backend actual:   $BACKEND_ENDPOINT"
        return 1
    fi

    # Check if both versions were deployed recently (within 1 hour of each other)
    BACKEND_TIME=$(aws ecs describe-services \
        --cluster scalemap-cluster \
        --services ApiService \
        --region eu-west-1 \
        --query 'services[0].deployments[0].createdAt' \
        --output text)

    # Get S3 object modified time for frontend
    FRONTEND_TIME=$(aws s3api list-objects-v2 \
        --bucket scalemap-frontend-prod-884337373956 \
        --query 'Contents[?Key==`index.html`].LastModified' \
        --output text)

    echo "Backend deployed: $BACKEND_TIME"
    echo "Frontend deployed: $FRONTEND_TIME"

    # If we can extract timestamps, compare them
    # (This is a simplified check - in practice you'd parse the timestamps)
    echo "✅ Version timestamps recorded"

    return 0
}

detect_mismatch
```

---

## 2. **Synchronized Deployment Process**

### **Coordinated Build & Deploy Script**
```bash
#!/bin/bash
# synchronized-deploy.sh - Deploy frontend and backend together

set -e  # Exit on any error

# Configuration
export VERSION_TAG="v$(date +%Y%m%d-%H%M%S)"
export ECR_URI="884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api"
export BACKEND_ENDPOINT="https://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com"

echo "🚀 Starting synchronized deployment: $VERSION_TAG"

# Step 1: Pre-deployment checks
echo "1️⃣ Pre-deployment validation..."
git status --porcelain | grep -q . && {
    echo "❌ Uncommitted changes detected. Commit or stash changes first."
    exit 1
}

npm test || {
    echo "❌ Tests failed. Fix tests before deploying."
    exit 1
}

# Step 2: Build Docker image with correct frontend configuration
echo "2️⃣ Building Docker image with version $VERSION_TAG..."

# Ensure frontend is built with correct API endpoint
export VITE_API_URL="$BACKEND_ENDPOINT"
export VITE_BUILD_VERSION="$VERSION_TAG"
export VITE_COGNITO_USER_POOL_ID="eu-west-1_iGWQ7N6sH"
export VITE_COGNITO_CLIENT_ID="6e7ct8tmbmhgvva2ngdn5hi6v1"
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

# Step 3: Verify build contains correct configuration
echo "3️⃣ Verifying build configuration..."
docker run --rm scalemap-api:$VERSION_TAG \
    sh -c "grep -q '$BACKEND_ENDPOINT' /app/dist/public/assets/*.js && echo '✅ Correct API endpoint' || (echo '❌ Wrong API endpoint' && exit 1)"

# Step 4: Push to ECR
echo "4️⃣ Pushing to ECR..."
aws ecr get-login-password --region eu-west-1 | \
    docker login --username AWS --password-stdin $ECR_URI

docker tag scalemap-api:$VERSION_TAG $ECR_URI:$VERSION_TAG
docker tag scalemap-api:latest $ECR_URI:latest
docker push $ECR_URI:$VERSION_TAG
docker push $ECR_URI:latest

# Step 5: Deploy backend
echo "5️⃣ Deploying backend..."
aws ecs update-service \
    --cluster scalemap-cluster \
    --service ApiService \
    --force-new-deployment \
    --region eu-west-1

# Wait for backend deployment to start
echo "⏳ Waiting for backend deployment to start..."
sleep 30

# Step 6: Extract and deploy frontend
echo "6️⃣ Deploying frontend..."
docker create --name frontend-temp $ECR_URI:$VERSION_TAG
docker cp frontend-temp:/app/dist/public ./frontend-dist
docker rm frontend-temp

# Add version metadata to frontend
echo "$VERSION_TAG" > ./frontend-dist/version.txt
echo "Backend: $ECR_URI:$VERSION_TAG" >> ./frontend-dist/version.txt
echo "Deployed: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> ./frontend-dist/version.txt

# Upload to S3 with version-specific cache control
export S3_BUCKET="scalemap-frontend-prod-884337373956"

# Upload static assets (JS, CSS) with long cache
aws s3 sync ./frontend-dist s3://$S3_BUCKET/ \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "*.html" \
    --exclude "version.txt"

# Upload HTML and version file with short cache
aws s3 sync ./frontend-dist s3://$S3_BUCKET/ \
    --cache-control "public,max-age=60,must-revalidate" \
    --exclude "*" \
    --include "*.html" \
    --include "version.txt"

# Step 7: Invalidate CloudFront
echo "7️⃣ Invalidating CloudFront cache..."
export CLOUDFRONT_DISTRIBUTION_ID="E1OGYBMF9QDMX9"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*.html" "/index.html" "/" "/version.txt" \
    --query 'Invalidation.Id' \
    --output text)

echo "CloudFront invalidation: $INVALIDATION_ID"

# Step 8: Wait for backend deployment to complete
echo "8️⃣ Waiting for backend deployment to complete..."
aws ecs wait services-stable \
    --cluster scalemap-cluster \
    --services ApiService \
    --region eu-west-1

# Step 9: Verification
echo "9️⃣ Verifying synchronized deployment..."

# Check backend health
sleep 10
curl -f "$BACKEND_ENDPOINT/health" || {
    echo "❌ Backend health check failed"
    exit 1
}

# Wait for CloudFront invalidation
echo "⏳ Waiting for CloudFront invalidation to complete..."
aws cloudfront wait invalidation-completed \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --id $INVALIDATION_ID

# Check frontend version
sleep 5
DEPLOYED_VERSION=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt | head -1)
if [ "$DEPLOYED_VERSION" = "$VERSION_TAG" ]; then
    echo "✅ Frontend version matches: $DEPLOYED_VERSION"
else
    echo "❌ Frontend version mismatch. Expected: $VERSION_TAG, Got: $DEPLOYED_VERSION"
    exit 1
fi

# Check frontend connects to correct backend
FRONTEND_BACKEND=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/index-*.js | \
    grep -o 'http://[^"]*elb\.amazonaws\.com' | head -1)

if [ "$FRONTEND_BACKEND" = "$BACKEND_ENDPOINT" ]; then
    echo "✅ Frontend points to correct backend: $FRONTEND_BACKEND"
else
    echo "❌ Frontend backend mismatch. Expected: $BACKEND_ENDPOINT, Got: $FRONTEND_BACKEND"
    exit 1
fi

# Clean up
rm -rf ./frontend-dist

echo "🎉 Synchronized deployment complete!"
echo "Version: $VERSION_TAG"
echo "Backend: $ECR_URI:$VERSION_TAG"
echo "Frontend: https://d2nr28qnjfjgb5.cloudfront.net"
echo "Verification: https://d2nr28qnjfjgb5.cloudfront.net/version.txt"
```

---

## 3. **Environment Variable Synchronization**

### **Environment Variable Validation**
```bash
#!/bin/bash
# env-sync-check.sh - Ensure all environments have consistent configuration

check_env_sync() {
    echo "🔍 Checking environment variable synchronization..."

    # Check frontend build environment
    echo "Frontend build environment:"
    echo "  VITE_API_URL: $VITE_API_URL"
    echo "  VITE_COGNITO_USER_POOL_ID: $VITE_COGNITO_USER_POOL_ID"
    echo "  VITE_COGNITO_CLIENT_ID: $VITE_COGNITO_CLIENT_ID"

    # Check what's actually in the built frontend
    if [ -d "dist" ]; then
        echo "Built frontend configuration:"

        # Extract API URL from built assets
        BUILT_API_URL=$(grep -o 'http://[^"]*elb\.amazonaws\.com' dist/assets/*.js | head -1)
        echo "  Built API URL: $BUILT_API_URL"

        # Extract Cognito config
        BUILT_USER_POOL=$(grep -o 'eu-west-1_[a-zA-Z0-9]*' dist/assets/*.js | head -1)
        echo "  Built User Pool: $BUILT_USER_POOL"

        # Validate consistency
        if [ "$VITE_API_URL" = "$BUILT_API_URL" ]; then
            echo "✅ API URL consistent"
        else
            echo "❌ API URL mismatch!"
            echo "   Build env: $VITE_API_URL"
            echo "   Built assets: $BUILT_API_URL"
        fi

        if [ "$VITE_COGNITO_USER_POOL_ID" = "$BUILT_USER_POOL" ]; then
            echo "✅ Cognito User Pool consistent"
        else
            echo "❌ Cognito User Pool mismatch!"
            echo "   Build env: $VITE_COGNITO_USER_POOL_ID"
            echo "   Built assets: $BUILT_USER_POOL"
        fi
    else
        echo "⚠️ No dist directory found. Run 'npm run build' first."
    fi
}

check_env_sync
```

### **Environment File Templates**

#### **Production Environment (.env.production)**
```bash
# Production Environment Variables
NODE_ENV=production

# Frontend Configuration (Build-time)
VITE_API_URL=https://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com
VITE_COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
VITE_COGNITO_CLIENT_ID=6e7ct8tmbmhgvva2ngdn5hi6v1
VITE_AWS_REGION=eu-west-1
VITE_STRIPE_PUBLIC_KEY=pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA
VITE_ENVIRONMENT=production

# Build Metadata
VITE_BUILD_VERSION=${VERSION_TAG:-manual}
VITE_BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

#### **Development Environment (.env.development)**
```bash
# Development Environment Variables
NODE_ENV=development

# Frontend Configuration (Build-time)
VITE_API_URL=http://localhost:5000
VITE_COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
VITE_COGNITO_CLIENT_ID=6e7ct8tmbmhgvva2ngdn5hi6v1
VITE_AWS_REGION=eu-west-1
VITE_STRIPE_PUBLIC_KEY=pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA
VITE_ENVIRONMENT=development

# Backend Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/scalemap_dev
OPENAI_API_KEY=your-dev-openai-key
STRIPE_SECRET_KEY=sk_test_your-dev-stripe-key
```

---

## 4. **Cache Management**

### **CloudFront Cache Invalidation Strategy**
```bash
#!/bin/bash
# cache-management.sh - Intelligent cache invalidation

invalidate_cache() {
    local DISTRIBUTION_ID="E1OGYBMF9QDMX9"
    local CHANGE_TYPE="$1"  # full, frontend-only, or emergency

    case $CHANGE_TYPE in
        "full")
            # Full deployment - invalidate everything
            echo "🗂️ Full cache invalidation..."
            aws cloudfront create-invalidation \
                --distribution-id $DISTRIBUTION_ID \
                --paths "/*" \
                --query 'Invalidation.Id' \
                --output text
            ;;
        "frontend-only")
            # Frontend changes only - invalidate HTML and version files
            echo "📄 Frontend-only cache invalidation..."
            aws cloudfront create-invalidation \
                --distribution-id $DISTRIBUTION_ID \
                --paths "/*.html" "/index.html" "/" "/version.txt" \
                --query 'Invalidation.Id' \
                --output text
            ;;
        "emergency")
            # Emergency - invalidate everything immediately
            echo "🚨 Emergency cache invalidation..."
            aws cloudfront create-invalidation \
                --distribution-id $DISTRIBUTION_ID \
                --paths "/*" \
                --query 'Invalidation.Id' \
                --output text
            ;;
        *)
            echo "Usage: invalidate_cache [full|frontend-only|emergency]"
            return 1
            ;;
    esac
}

# Wait for invalidation to complete
wait_for_invalidation() {
    local INVALIDATION_ID="$1"
    local DISTRIBUTION_ID="E1OGYBMF9QDMX9"

    echo "⏳ Waiting for invalidation $INVALIDATION_ID to complete..."
    aws cloudfront wait invalidation-completed \
        --distribution-id $DISTRIBUTION_ID \
        --id $INVALIDATION_ID

    echo "✅ Cache invalidation complete"
}

# Check cache status
check_cache_status() {
    echo "🔍 Checking cache status..."

    # Get current frontend version from cache
    CACHED_VERSION=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt | head -1)
    echo "Cached version: $CACHED_VERSION"

    # Get direct S3 version (bypassing cache)
    S3_VERSION=$(aws s3 cp s3://scalemap-frontend-prod-884337373956/version.txt - | head -1)
    echo "S3 version: $S3_VERSION"

    if [ "$CACHED_VERSION" = "$S3_VERSION" ]; then
        echo "✅ Cache is up to date"
    else
        echo "⚠️ Cache is stale"
        echo "Consider running: invalidate_cache frontend-only"
    fi
}
```

---

## 5. **Rollback Procedures**

### **Synchronized Rollback**
```bash
#!/bin/bash
# synchronized-rollback.sh - Rollback both frontend and backend together

rollback_synchronized() {
    local TARGET_VERSION="$1"

    if [ -z "$TARGET_VERSION" ]; then
        echo "Usage: rollback_synchronized <version-tag>"
        echo "Available versions:"
        aws ecr describe-images \
            --repository-name scalemap-api \
            --region eu-west-1 \
            --query 'imageDetails[*].imageTags[0]' \
            --output table
        return 1
    fi

    echo "🔄 Rolling back to version: $TARGET_VERSION"

    # Step 1: Rollback backend
    echo "1️⃣ Rolling back backend..."

    # Find task definition with the target version
    TARGET_IMAGE="884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api:$TARGET_VERSION"

    # Get task definitions and find the one with our target image
    TASK_DEF_ARN=$(aws ecs list-task-definitions \
        --family-prefix scalemap-api \
        --status ACTIVE \
        --region eu-west-1 \
        --query 'taskDefinitionArns[]' \
        --output text | \
        while read arn; do
            IMAGE=$(aws ecs describe-task-definition \
                --task-definition "$arn" \
                --region eu-west-1 \
                --query 'taskDefinition.containerDefinitions[0].image' \
                --output text)
            if [ "$IMAGE" = "$TARGET_IMAGE" ]; then
                echo "$arn"
                break
            fi
        done)

    if [ -z "$TASK_DEF_ARN" ]; then
        echo "❌ No task definition found for version $TARGET_VERSION"
        return 1
    fi

    # Update ECS service
    aws ecs update-service \
        --cluster scalemap-cluster \
        --service ApiService \
        --task-definition "$TASK_DEF_ARN" \
        --region eu-west-1

    # Step 2: Extract frontend from the target version
    echo "2️⃣ Rolling back frontend..."

    docker pull $TARGET_IMAGE
    docker create --name rollback-temp $TARGET_IMAGE
    docker cp rollback-temp:/app/dist/public ./rollback-frontend
    docker rm rollback-temp

    # Step 3: Deploy old frontend
    export S3_BUCKET="scalemap-frontend-prod-884337373956"

    aws s3 sync ./rollback-frontend s3://$S3_BUCKET/ \
        --delete \
        --cache-control "public,max-age=31536000,immutable" \
        --exclude "*.html"

    aws s3 sync ./rollback-frontend s3://$S3_BUCKET/ \
        --cache-control "public,max-age=60,must-revalidate" \
        --exclude "*" \
        --include "*.html"

    # Step 4: Invalidate cache
    echo "3️⃣ Invalidating cache..."
    INVALIDATION_ID=$(invalidate_cache "full")

    # Step 5: Wait for completion
    echo "4️⃣ Waiting for rollback to complete..."
    aws ecs wait services-stable \
        --cluster scalemap-cluster \
        --services ApiService \
        --region eu-west-1

    wait_for_invalidation "$INVALIDATION_ID"

    # Clean up
    rm -rf ./rollback-frontend

    echo "✅ Rollback to $TARGET_VERSION complete"
}
```

---

## 6. **Monitoring & Alerts**

### **Version Drift Detection**
```bash
#!/bin/bash
# version-monitor.sh - Continuous monitoring for version drift

monitor_versions() {
    while true; do
        echo "🔍 $(date): Checking version synchronization..."

        # Get current versions
        BACKEND_VERSION=$(aws ecs describe-services \
            --cluster scalemap-cluster \
            --services ApiService \
            --region eu-west-1 \
            --query 'services[0].taskDefinition' \
            --output text | \
            xargs aws ecs describe-task-definition \
                --task-definition \
                --region eu-west-1 \
                --query 'taskDefinition.containerDefinitions[0].image' \
                --output text | \
            cut -d: -f2)

        FRONTEND_VERSION=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt | head -1)

        echo "Backend: $BACKEND_VERSION"
        echo "Frontend: $FRONTEND_VERSION"

        if [ "$BACKEND_VERSION" != "$FRONTEND_VERSION" ]; then
            echo "❌ VERSION MISMATCH DETECTED!"
            # Send alert (configure as needed)
            # slack_alert "Version mismatch: Backend=$BACKEND_VERSION, Frontend=$FRONTEND_VERSION"
        else
            echo "✅ Versions synchronized"
        fi

        sleep 300  # Check every 5 minutes
    done
}

# Run monitor in background
# monitor_versions &
```

---

## 📋 **Version Sync Checklist**

### **Before Deployment**
- [ ] Verify git status is clean
- [ ] Set correct environment variables
- [ ] Test build locally
- [ ] Check current deployed versions

### **During Deployment**
- [ ] Build with correct API endpoint
- [ ] Verify build configuration
- [ ] Deploy backend first
- [ ] Extract frontend from same Docker image
- [ ] Deploy frontend with version metadata
- [ ] Invalidate cache appropriately

### **After Deployment**
- [ ] Verify backend health
- [ ] Verify frontend version
- [ ] Test frontend-backend connectivity
- [ ] Check version synchronization
- [ ] Monitor for 15 minutes

### **For Rollback**
- [ ] Identify target version
- [ ] Rollback backend and frontend together
- [ ] Verify rollback success
- [ ] Document rollback reason

---

**Changelog:**
- 2025-09-29: Initial version synchronization procedures created