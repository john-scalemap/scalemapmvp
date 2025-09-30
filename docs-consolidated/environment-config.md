# ScaleMap Environment Configuration Reference

**Status:** Authoritative
**Last Updated:** 2025-09-30
**Purpose:** Single source of truth for all environment variables and endpoint mappings

## ⚠️ **CRITICAL: Configuration Synchronization**

**ALL THREE** of these must have matching Cognito Client ID:
1. `.env` file: `VITE_COGNITO_CLIENT_ID` and `COGNITO_CLIENT_ID`
2. Docker build args: `--build-arg VITE_COGNITO_CLIENT_ID`
3. AWS Secrets Manager: `/scalemap/prod/cognito-config` → `clientId`

**Mismatch = "Invalid token" errors.** See [troubleshooting-guide.md](./troubleshooting-guide.md#-authentication-redirect-loop--invalid-token-errors)

## 🎯 **Configuration Hierarchy**

**Priority Order (highest to lowest):**
1. ECS Task Definition environment variables (production)
2. Local `.env` file (development)
3. Default values in code

---

## 1. **Production Configuration**

### **Backend Environment Variables (ECS Task Definition)**
```bash
# Node.js Configuration
NODE_ENV=production
PORT=3000

# AWS Configuration
AWS_REGION=eu-west-1
AWS_ACCOUNT_ID=884337373956

# Database (from AWS Secrets Manager)
DATABASE_URL=postgresql://[username]:[password]@[rds-endpoint]:5432/scalemap?ssl=true

# External APIs (from AWS Secrets Manager)
OPENAI_API_KEY=[stored-in-secrets-manager]
STRIPE_SECRET_KEY=[stored-in-secrets-manager]

# Cognito Configuration (from AWS Secrets Manager: /scalemap/prod/cognito-config)
# ⚠️ MUST match VITE_COGNITO_CLIENT_ID below
COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
COGNITO_CLIENT_ID=4oh46v98dsu1c8csu4tn6ddgq1

# S3 Configuration
S3_BUCKET_NAME=scalemap-storage

# Logging
LOG_LEVEL=info
```

### **Frontend Environment Variables (Build-time)**
```bash
# Cognito Configuration (PUBLIC - embedded in build)
# ⚠️ UPDATED 2025-09-30: Changed to client WITHOUT secret hash requirement
VITE_COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
VITE_COGNITO_CLIENT_ID=4oh46v98dsu1c8csu4tn6ddgq1  # NO SECRET HASH
VITE_AWS_REGION=eu-west-1

# Stripe Configuration (PUBLIC - embedded in build)
VITE_STRIPE_PUBLIC_KEY=pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA

# API Endpoint (PUBLIC - embedded in build)
# ⚠️ CRITICAL: Must be absolute URL, used by useAuth.ts and queryClient.ts
VITE_API_URL=https://scalem-scale-rrvivslk5gxy-832498527.eu-west-1.elb.amazonaws.com

# Build Version (injected at build time)
VITE_BUILD_VERSION=${VERSION_TAG}

# Environment Identifier
VITE_ENVIRONMENT=production
```

---

## 2. **Development Configuration**

### **Local .env File**
```bash
# Node.js Configuration
NODE_ENV=development
PORT=5000

# Database (Local or development RDS)
DATABASE_URL=postgresql://postgres:password@localhost:5432/scalemap_dev

# External APIs (Development keys)
OPENAI_API_KEY=sk-...  # Your development OpenAI key
STRIPE_SECRET_KEY=sk_test_...  # Stripe test key

# Cognito Configuration (Same as production for consistency)
# ⚠️ UPDATED 2025-09-30: Use client without secret hash
COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
COGNITO_CLIENT_ID=4oh46v98dsu1c8csu4tn6ddgq1

# Frontend Development
VITE_COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
VITE_COGNITO_CLIENT_ID=4oh46v98dsu1c8csu4tn6ddgq1  # NO SECRET HASH
VITE_AWS_REGION=eu-west-1
VITE_STRIPE_PUBLIC_KEY=pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA
VITE_API_URL=http://localhost:5000  # Local backend
VITE_ENVIRONMENT=development

# Logging
LOG_LEVEL=debug
```

---

## 3. **Endpoint Mappings**

### **Production Endpoints**
```bash
# Frontend (CloudFront)
FRONTEND_URL=https://d2nr28qnjfjgb5.cloudfront.net

# Backend API (Application Load Balancer)
API_URL=https://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com

# Health Check Endpoints
HEALTH_CHECK_URL=$API_URL/health
FRONTEND_HEALTH_CHECK=$FRONTEND_URL

# S3 Bucket (for documents)
S3_BUCKET_URL=https://scalemap-documents-production.s3.eu-west-1.amazonaws.com

# CloudFront Distribution
CLOUDFRONT_DISTRIBUTION_ID=E1OGYBMF9QDMX9
CLOUDFRONT_URL=https://d2nr28qnjfjgb5.cloudfront.net
```

### **Development Endpoints**
```bash
# Frontend (Vite dev server)
FRONTEND_URL=http://localhost:5173

# Backend API (Express dev server)
API_URL=http://localhost:5000

# Health Check Endpoints
HEALTH_CHECK_URL=http://localhost:5000/health
FRONTEND_HEALTH_CHECK=http://localhost:5173
```

---

## 4. **AWS Resource Configuration**

### **ECS Configuration**
```bash
# ECS Cluster
ECS_CLUSTER_NAME=scalemap-cluster
ECS_SERVICE_NAME=ApiService

# Task Definition
TASK_DEFINITION_FAMILY=scalemap-api-task
TASK_CPU=1024      # 1 vCPU
TASK_MEMORY=2048   # 2GB RAM

# Container Configuration
CONTAINER_NAME=ApiContainer
CONTAINER_PORT=3000
```

### **ECR Configuration**
```bash
# ECR Repository
ECR_REPOSITORY_NAME=scalemap-api
ECR_REPOSITORY_URI=884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api

# Image Tags
IMAGE_TAG_LATEST=latest
IMAGE_TAG_PATTERN=v%Y%m%d-%H%M%S  # Timestamp-based versioning
```

### **S3 & CloudFront Configuration**
```bash
# S3 Buckets
FRONTEND_BUCKET=scalemap-frontend-prod-884337373956
DOCUMENTS_BUCKET=scalemap-documents-production

# CloudFront
CLOUDFRONT_DISTRIBUTION_ID=E1OGYBMF9QDMX9
CLOUDFRONT_ORIGIN_DOMAIN=scalemap-frontend-prod-884337373956.s3.eu-west-1.amazonaws.com
```

---

## 5. **Secrets Manager Configuration**

### **Secret Names & ARNs**
```bash
# Database URL
DATABASE_SECRET_NAME=/scalemap/prod/database-url
DATABASE_SECRET_ARN=arn:aws:secretsmanager:eu-west-1:884337373956:secret:/scalemap/prod/database-url-YQa0fN

# OpenAI API Key
OPENAI_SECRET_NAME=/scalemap/prod/openai-api-key
OPENAI_SECRET_ARN=arn:aws:secretsmanager:eu-west-1:884337373956:secret:/scalemap/prod/openai-api-key-osgzC0

# Stripe Secret Key
STRIPE_SECRET_NAME=/scalemap/prod/stripe-secret-key
STRIPE_SECRET_ARN=arn:aws:secretsmanager:eu-west-1:884337373956:secret:/scalemap/prod/stripe-secret-key-ngjK9N

# Cognito Configuration
COGNITO_SECRET_NAME=/scalemap/prod/cognito-config
COGNITO_SECRET_ARN=arn:aws:secretsmanager:eu-west-1:884337373956:secret:/scalemap/prod/cognito-config-KU3y3T
```

### **Secrets Structure**
```json
// /scalemap/prod/database-url
{
  "database_url": "postgresql://username:password@rds-endpoint:5432/scalemap?ssl=true"
}

// /scalemap/prod/cognito-config
{
  "user_pool_id": "eu-west-1_iGWQ7N6sH",
  "client_id": "4oh46v98dsu1c8csu4tn6ddgq1"
}
```

---

## 6. **Configuration Validation**

### **Environment Variable Checks**
```bash
# Backend validation script
#!/bin/bash
# Check required environment variables

check_var() {
    if [ -z "${!1}" ]; then
        echo "❌ Missing: $1"
        return 1
    else
        echo "✅ Found: $1"
        return 0
    fi
}

echo "Checking backend environment variables..."
check_var "NODE_ENV"
check_var "DATABASE_URL"
check_var "COGNITO_USER_POOL_ID"
check_var "COGNITO_CLIENT_ID"
check_var "OPENAI_API_KEY"
check_var "STRIPE_SECRET_KEY"
check_var "S3_BUCKET_NAME"
```

### **Frontend Build Validation**
```bash
# Frontend validation script
#!/bin/bash
# Check Vite environment variables

echo "Checking frontend build variables..."
check_var "VITE_COGNITO_USER_POOL_ID"
check_var "VITE_COGNITO_CLIENT_ID"
check_var "VITE_AWS_REGION"
check_var "VITE_STRIPE_PUBLIC_KEY"
check_var "VITE_API_URL"

# Check built assets contain correct config
if [ -f "dist/assets/index-*.js" ]; then
    if grep -q "eu-west-1_iGWQ7N6sH" dist/assets/index-*.js; then
        echo "✅ Cognito User Pool ID found in build"
    else
        echo "❌ Cognito User Pool ID missing from build"
    fi
fi
```

---

## 7. **Common Configuration Issues**

### **Issue: Frontend connects to wrong API**
**Cause:** `VITE_API_URL` not set correctly during build
**Fix:**
```bash
# Check what's actually in the built frontend
grep -r "localhost\|127.0.0.1" dist/
# Should show no results in production build

# Rebuild with correct API URL
VITE_API_URL=https://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com npm run build
```

### **Issue: Cognito secret hash error**
**Cause:** Client app incorrectly configured with secret hash requirement
**Fix:** See [cognito-config-reference.md](./cognito-config-reference.md)

### **Issue: Database connection failures**
**Cause:** DATABASE_URL format or SSL configuration
**Fix:**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://username:password@endpoint:5432/database?ssl=true

# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

### **Issue: S3 upload failures**
**Cause:** Bucket name mismatch or permissions
**Fix:**
```bash
# Verify bucket exists and is accessible
aws s3 ls s3://scalemap-documents-production/
aws s3 ls s3://scalemap-frontend-prod-884337373956/
```

---

## 8. **Environment Sync Procedures**

### **Sync Development with Production**
```bash
# Copy production Cognito config to development
export VITE_COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
export VITE_COGNITO_CLIENT_ID=4oh46v98dsu1c8csu4tn6ddgq1

# Update local .env file
echo "VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID" >> .env
echo "VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID" >> .env
```

### **Verify Configuration Sync**
```bash
# Compare production vs development
echo "Production Cognito User Pool: eu-west-1_iGWQ7N6sH"
echo "Development Cognito User Pool: $(grep VITE_COGNITO_USER_POOL_ID .env | cut -d= -f2)"

# They should match
```

---

## 📋 **Configuration Checklist**

### **Before Deployment**
- [ ] All environment variables set correctly
- [ ] Frontend build includes correct API URL
- [ ] Cognito configuration matches production
- [ ] Secrets Manager ARNs are correct
- [ ] S3 bucket names are consistent

### **After Deployment**
- [ ] Health checks pass with correct environment
- [ ] Frontend connects to correct backend
- [ ] Authentication works with production Cognito
- [ ] File uploads work with correct S3 bucket

---

**Changelog:**
- 2025-09-29: Initial environment configuration reference created