# ScaleMap Deployment Guide - Docker First Approach

**Status:** Authoritative
**Last Updated:** 2025-09-29
**Process:** Docker → ECR → ECS (NO CodeBuild)

## 🎯 **Core Principle: Docker First**

**RULE:** All deployments use local Docker builds. AWS CodeBuild is deprecated for ScaleMap deployments.

**Why:** Consistent builds, faster iteration, developer control, eliminates build environment discrepancies.

---

## 1. **Prerequisites & Environment Setup**

### **Required Tools**
```bash
# Verify you have these installed:
docker --version          # Docker 24.x+
aws --version             # AWS CLI 2.x
node --version            # Node.js 20.x
npm --version             # npm 10.x+
```

### **AWS Configuration**
```bash
# Configure AWS credentials (one-time setup)
aws configure
# Region: eu-west-1
# Access Key: [Your access key]
# Secret Key: [Your secret key]

# Verify access
aws sts get-caller-identity
aws ecr get-login-password --region eu-west-1
```

### **Environment Variables**
```bash
# Set these in your shell profile (.bashrc, .zshrc, etc.)
export AWS_REGION=eu-west-1
export AWS_ACCOUNT_ID=884337373956
export ECR_REPOSITORY_URI=884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api
export ECS_CLUSTER_NAME=scalemap-cluster
export ECS_SERVICE_NAME=ApiService
```

---

## 2. **Current Production State Audit**

### **Before Any Deployment - Check Current State**
```bash
# What's currently running?
aws ecs describe-services \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].{Status:status,RunningCount:runningCount,TaskDefinition:taskDefinition}'

# What image version is deployed?
aws ecs describe-task-definition \
  --task-definition $(aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $AWS_REGION --query 'services[0].taskDefinition' --output text) \
  --region $AWS_REGION \
  --query 'taskDefinition.containerDefinitions[0].image'

# Frontend version check
curl -s https://d2nr28qnjfjgb5.cloudfront.net/ | grep -o 'version.*'
```

---

## 3. **Docker Build Process**

### **Pre-Build Checklist**
```bash
# 1. Verify you're on the correct branch
git status
git log --oneline -3

# 2. Ensure no uncommitted changes
git diff --exit-code

# 3. Run local tests
npm test

# 4. Verify environment variables are correct
cat .env | grep -E "(VITE_|NODE_ENV|DATABASE_URL)"
```

### **Build & Tag Docker Image**
```bash
# Navigate to project root
cd /path/to/scalemapmvp

# Create version tag
export VERSION_TAG="v$(date +%Y%m%d-%H%M%S)"
echo "Building version: $VERSION_TAG"

# Build Docker image
docker build \
  --build-arg VITE_COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH \
  --build-arg VITE_COGNITO_CLIENT_ID=6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --build-arg VITE_AWS_REGION=eu-west-1 \
  --build-arg VITE_STRIPE_PUBLIC_KEY=pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA \
  -t scalemap-api:$VERSION_TAG \
  -t scalemap-api:latest \
  -f server/Dockerfile .

# Verify build success
docker images scalemap-api:$VERSION_TAG
docker images scalemap-api:latest

# Test image locally (optional but recommended)
docker run --rm -p 5000:5000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
  scalemap-api:$VERSION_TAG &

# Quick health check
sleep 5
curl http://localhost:5000/health
docker stop $(docker ps -q --filter ancestor=scalemap-api:$VERSION_TAG)
```

---

## 4. **Push to ECR & Deploy to ECS**

### **ECR Login & Push**
```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REPOSITORY_URI

# Tag for ECR
docker tag scalemap-api:$VERSION_TAG $ECR_REPOSITORY_URI:$VERSION_TAG
docker tag scalemap-api:latest $ECR_REPOSITORY_URI:latest

# Push to ECR
docker push $ECR_REPOSITORY_URI:$VERSION_TAG
docker push $ECR_REPOSITORY_URI:latest

# Verify push
aws ecr describe-images \
  --repository-name scalemap-api \
  --region $AWS_REGION \
  --query 'imageDetails[0].{Tags:imageTags,Size:imageSizeInBytes,Pushed:imagePushedAt}'
```

### **Deploy to ECS**
```bash
# Update ECS service with new image
aws ecs update-service \
  --cluster $ECS_CLUSTER_NAME \
  --service $ECS_SERVICE_NAME \
  --force-new-deployment \
  --region $AWS_REGION

# Monitor deployment progress
echo "Monitoring deployment..."
aws ecs wait services-stable \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION

# Verify deployment success
aws ecs describe-services \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}'
```

---

## 5. **Frontend Deployment & Cache Management**

### **Extract & Deploy Frontend**
```bash
# Extract frontend from Docker image
docker create --name frontend-temp $ECR_REPOSITORY_URI:$VERSION_TAG
docker cp frontend-temp:/app/dist/public ./frontend-dist
docker rm frontend-temp

# Verify frontend build
ls -la ./frontend-dist/
grep -q "eu-west-1_iGWQ7N6sH" ./frontend-dist/assets/*.js && \
  echo "✓ Cognito config found" || echo "✗ Cognito config missing"

# Upload to S3 with cache control
export S3_BUCKET=scalemap-frontend-prod-884337373956

# Upload assets with long cache (1 year)
aws s3 sync ./frontend-dist s3://$S3_BUCKET/ \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.html"

# Upload HTML with short cache (60 seconds)
aws s3 sync ./frontend-dist s3://$S3_BUCKET/ \
  --cache-control "public,max-age=60,must-revalidate" \
  --exclude "*" \
  --include "*.html"

# Invalidate CloudFront cache
export CLOUDFRONT_DISTRIBUTION_ID=E1OGYBMF9QDMX9
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*.html" "/index.html" "/"

# Clean up
rm -rf ./frontend-dist
```

---

## 6. **Post-Deployment Verification**

### **Health Checks**
```bash
# Backend health check
export ALB_ENDPOINT="Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com"
curl -f http://$ALB_ENDPOINT/api/health | jq .

# Frontend health check
curl -f https://d2nr28qnjfjgb5.cloudfront.net/ | grep -o '<title>.*</title>'

# Authentication flow test
curl -X POST http://$ALB_ENDPOINT/api/auth/test-endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### **Version Verification**
```bash
# Check deployed backend version
aws ecs describe-task-definition \
  --task-definition $(aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $AWS_REGION --query 'services[0].taskDefinition' --output text) \
  --region $AWS_REGION \
  --query 'taskDefinition.containerDefinitions[0].image'

# Check frontend version (look for build timestamp in source)
curl -s https://d2nr28qnjfjgb5.cloudfront.net/ | grep -o 'Build.*[0-9]'

# Log successful deployment
echo "✅ Deployment successful: $VERSION_TAG at $(date)"
echo "Backend: $ECR_REPOSITORY_URI:$VERSION_TAG"
echo "Frontend: CloudFront updated"
```

---

## 7. **Emergency Procedures**

### **Rollback Deployment**
```bash
# Get previous task definition
PREVIOUS_TASK_DEF=$(aws ecs list-task-definitions \
  --family-prefix scalemap-api \
  --status ACTIVE \
  --sort DESC \
  --region $AWS_REGION \
  --query 'taskDefinitionArns[1]' \
  --output text)

# Rollback ECS service
aws ecs update-service \
  --cluster $ECS_CLUSTER_NAME \
  --service $ECS_SERVICE_NAME \
  --task-definition $PREVIOUS_TASK_DEF \
  --region $AWS_REGION

# Wait for rollback to complete
aws ecs wait services-stable \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION

echo "✅ Rollback complete"
```

### **Emergency Debug**
```bash
# Get running task logs
TASK_ARN=$(aws ecs list-tasks \
  --cluster $ECS_CLUSTER_NAME \
  --service-name $ECS_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text)

aws logs tail /ecs/scalemap-api \
  --follow \
  --region $AWS_REGION
```

---

## 8. **Common Issues & Quick Fixes**

### **Issue: "CodeBuild still being used"**
**Fix:** Delete any CodeBuild triggers. Use this Docker process only.

### **Issue: "Frontend showing old version"**
**Fix:** Check CloudFront invalidation completed:
```bash
aws cloudfront get-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --id [INVALIDATION_ID]
```

### **Issue: "Backend not responding"**
**Fix:** Check ECS task status:
```bash
aws ecs describe-tasks \
  --cluster $ECS_CLUSTER_NAME \
  --tasks $TASK_ARN \
  --region $AWS_REGION \
  --query 'tasks[0].lastStatus'
```

---

## 📋 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Git status clean
- [ ] Tests passing
- [ ] Environment variables verified
- [ ] Current production state documented

### **Build**
- [ ] Docker build successful
- [ ] Local health check passed
- [ ] Version tagged correctly

### **Deploy**
- [ ] ECR push successful
- [ ] ECS deployment stable
- [ ] Frontend uploaded to S3
- [ ] CloudFront invalidation triggered

### **Verify**
- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] Authentication works
- [ ] Version tags match

### **Document**
- [ ] Deployment logged with version
- [ ] Any issues noted
- [ ] Next steps recorded

---

**Changelog:**
- 2025-09-29: Initial Docker-first deployment guide created