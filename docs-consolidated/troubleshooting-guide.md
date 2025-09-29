# ScaleMap Troubleshooting Guide

**Status:** Authoritative
**Last Updated:** 2025-09-29
**Purpose:** Proven solutions for common deployment and operational issues

## 🎯 **Quick Issue Resolution**

**Emergency Shortcuts:**
- **Frontend shows old version:** [Jump to Cache Issues](#cache-issues)
- **Cognito secret hash error:** [Jump to Authentication Issues](#authentication-issues)
- **API not responding:** [Jump to Backend Issues](#backend-issues)
- **Deploy script failing:** [Jump to Deployment Issues](#deployment-issues)
- **Docker build problems:** [Jump to Build Issues](#build-issues)

---

## 1. **Authentication Issues**

### **🚨 Dashboard Not Loading After Login / Authentication Loop**

**Symptoms:**
- Login returns 200 OK but dashboard doesn't load
- Redirected back to login page after successful authentication
- Browser shows login page when accessing `/dashboard`
- 401 Unauthorized errors on `/api/auth/user` after login

**Root Causes & Fixes:**

**Issue #1: Race Condition in Authentication State (95% confidence)**
- LoginForm redirects before user data is loaded
- `useAuth` hook requires both token AND user data to consider user authenticated
- **Fix:** Modified `client/src/components/auth/LoginForm.tsx:31` to await `queryClient.fetchQuery()` before redirecting

**Issue #2: Hard Redirects Destroying React State (85% confidence)**
- Protected routes using `window.location.href` cause full page reloads
- React state destroyed, authentication resets
- **Fix:** Replaced all `window.location.href` with router `setLocation()` in:
  - `client/src/pages/dashboard.tsx:60`
  - `client/src/pages/assessment.tsx`
  - `client/src/pages/assessment-detail.tsx`
  - `client/src/pages/profile.tsx`

**Issue #3: Frontend Calling Wrong API Endpoint (70% confidence)**
- Frontend making relative API calls (`/api/auth/user`) to CloudFront instead of backend ALB
- queryClient not using `VITE_API_URL` environment variable
- **Fix:** Modified `client/src/lib/queryClient.ts:7` to prepend `API_BASE_URL` to API calls
- **Related:** See "API Endpoints Not Updating" section below

**Verification:**
```bash
# Test authentication flow
# 1. Login should wait for user data before redirecting
# 2. Dashboard should use router navigation, not window.location.href
# 3. API calls should go to backend ALB, not CloudFront

# Check browser console for:
# - No race condition errors
# - Router navigation (not full page reload)
# - API calls to correct backend URL
```

### **🚨 Error: "Unable to verify secret hash for client"**

**Symptoms:**
- Login fails with secret hash error
- Frontend shows authentication errors
- Previously working auth suddenly breaks

**Root Cause:** App client misconfigured with secret generation enabled

**Immediate Fix:**
```bash
# Check current app client configuration
aws cognito-idp describe-user-pool-client \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --region eu-west-1 \
  --query 'UserPoolClient.GenerateSecret'

# If returns "true", fix it:
aws cognito-idp update-user-pool-client \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --generate-secret false \
  --region eu-west-1

echo "✅ Cognito app client fixed - secret generation disabled"
```

**Prevention:** Use the configuration in [cognito-config-reference.md](./cognito-config-reference.md)

### **🚨 Error: "Auth flow not supported for this client"**

**Symptoms:**
- Login attempts fail with auth flow error
- Different error than secret hash

**Immediate Fix:**
```bash
# Update app client with correct auth flows
aws cognito-idp update-user-pool-client \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region eu-west-1

echo "✅ Auth flows updated"
```

### **🚨 Error: "User does not exist" (but user does exist)**

**Symptoms:**
- Valid users get "user does not exist" error
- Intermittent login failures

**Diagnostic Steps:**
```bash
# Check user status
aws cognito-idp admin-get-user \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --username [USER_EMAIL] \
  --region eu-west-1

# Check if user needs confirmation
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --username [USER_EMAIL] \
  --region eu-west-1
```

---

## 2. **Cache Issues**

### **🚨 Frontend Shows Old Version**

**Symptoms:**
- New features missing from frontend
- Frontend connects to wrong API endpoints
- Users see cached old interface

**Immediate Fix:**
```bash
# Emergency cache clear
aws cloudfront create-invalidation \
  --distribution-id E1OGYBMF9QDMX9 \
  --paths "/*" \
  --region eu-west-1

# Wait for completion (5-15 minutes)
aws cloudfront wait invalidation-completed \
  --distribution-id E1OGYBMF9QDMX9 \
  --id [INVALIDATION_ID] \
  --region eu-west-1

# Verify fix
curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt
```

**If still showing old version:**
```bash
# Check if S3 actually has new files
aws s3 ls s3://scalemap-frontend-prod-884337373956/ --recursive | tail -10

# Check cache headers
curl -I https://d2nr28qnjfjgb5.cloudfront.net/

# Force browser cache clear
echo "Tell users to do: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
```

### **🚨 API Endpoints Not Updating**

**Symptoms:**
- Frontend built with wrong API URL
- CORS errors from frontend to backend
- API calls going to localhost in production
- Frontend making relative API calls to CloudFront instead of backend ALB
- 401 Unauthorized errors on `/api/auth/user` endpoint

**Root Cause:** `.dockerignore` was located in `server/` subdirectory instead of project root, causing `.env` file to be copied during Docker build and override build args

**Immediate Fix:**
```bash
# Check what API URL is in current frontend build
curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/index-*.js | \
  grep -o 'http://[^"]*' | grep -E '(localhost|elb\.amazonaws\.com)'

# If no output, VITE_API_URL was not embedded during build
# This means frontend is making relative calls (/api/auth/user) to CloudFront

# Solution 1: Ensure .dockerignore exists in project root (NOT server/ subdirectory)
# Create .dockerignore in project root with:
cat > .dockerignore <<'EOF'
node_modules
.git
.gitignore
*.test.ts
*.spec.ts
.env
.env.*
!.env.production
coverage
.vscode
.idea
*.log
npm-debug.log*
.DS_Store
.eslintrc
.prettierrc
jest.config.js
.postgres-data
tests
.bmad-core
.claude
docs
docs-consolidated
*.md
!README.md
EOF

# Solution 2: Verify Dockerfile has all required ARGs and passes them to build
# Check server/Dockerfile has:
#   ARG VITE_API_URL
#   ARG VITE_BUILD_VERSION
#   ENV VITE_API_URL=$VITE_API_URL
#   ENV VITE_BUILD_VERSION=$VITE_BUILD_VERSION
#   RUN VITE_API_URL=$VITE_API_URL \
#       VITE_BUILD_VERSION=$VITE_BUILD_VERSION \
#       ... npm run build

# Solution 3: Check deployment script passes all build args:
docker build \
  --build-arg VITE_API_URL="http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com" \
  --build-arg VITE_COGNITO_USER_POOL_ID="eu-west-1_iGWQ7N6sH" \
  --build-arg VITE_COGNITO_CLIENT_ID="6e7ct8tmbmhgvva2ngdn5hi6v1" \
  --build-arg VITE_AWS_REGION="eu-west-1" \
  --build-arg VITE_BUILD_VERSION="test" \
  -f server/Dockerfile \
  -t scalemap-api:test .

# Verify environment variable is embedded
docker run --rm scalemap-api:test sh -c 'grep -r "elb\.amazonaws\.com" /app/dist/public/assets/' && \
  echo "✅ API URL embedded" || echo "❌ API URL NOT embedded"

# If still failing, check client/src/lib/queryClient.ts uses:
#   const API_BASE_URL = import.meta.env.VITE_API_URL || '';
#   const fullUrl = url.startsWith('/api') ? `${API_BASE_URL}${url}` : url;
```

**Verification After Deployment:**
```bash
# Check deployed frontend has API URL
curl -s https://d2nr28qnjfjgb5.cloudfront.net/ | grep -o 'assets/index-[^"]*\.js' | head -1
# Then check that file for the backend URL
curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/index-XXXXXXX.js | \
  grep -o 'Scalem-Scale.*elb\.amazonaws\.com' && \
  echo "✅ Backend URL found in bundle" || \
  echo "❌ Backend URL NOT in bundle - rebuild required"
```

**Related Files:**
- `client/src/lib/queryClient.ts:7` - API_BASE_URL definition
- `server/Dockerfile:8-12` - Build arg declarations
- `docs-consolidated/scripts/deploy-production.sh` - Build command with args

---

## 3. **Backend Issues**

### **🚨 API Not Responding / 502 Bad Gateway**

**Symptoms:**
- Health check fails
- All API endpoints return 502
- ECS tasks failing

**Immediate Diagnostic:**
```bash
# Check ECS service status
aws ecs describe-services \
  --cluster scalemap-cluster \
  --services ApiService \
  --region eu-west-1 \
  --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}'

# Get running tasks
TASK_ARN=$(aws ecs list-tasks \
  --cluster scalemap-cluster \
  --service-name ApiService \
  --region eu-west-1 \
  --query 'taskArns[0]' \
  --output text)

# Check task status
aws ecs describe-tasks \
  --cluster scalemap-cluster \
  --tasks $TASK_ARN \
  --region eu-west-1 \
  --query 'tasks[0].{LastStatus:lastStatus,HealthStatus:healthStatus,StoppedReason:stoppedReason}'
```

**Check Logs:**
```bash
# View recent logs
aws logs tail /ecs/scalemap-api \
  --since 10m \
  --region eu-west-1

# Look for specific errors
aws logs filter-log-events \
  --log-group-name /ecs/scalemap-api \
  --filter-pattern "ERROR" \
  --start-time $(date -d '10 minutes ago' +%s)000 \
  --region eu-west-1
```

**Common Fixes:**
```bash
# If task is stopped, force new deployment
aws ecs update-service \
  --cluster scalemap-cluster \
  --service ApiService \
  --force-new-deployment \
  --region eu-west-1

# If still failing, check security groups
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*scalemap*" \
  --region eu-west-1 \
  --query 'SecurityGroups[*].{Name:GroupName,Rules:IpPermissions}'
```

### **🚨 Database Connection Failures**

**Symptoms:**
- API starts but database operations fail
- "Connection refused" or timeout errors
- Internal server errors on data operations

**Immediate Fix:**
```bash
# Test database connectivity from a known working environment
export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id /scalemap/prod/database-url \
  --region eu-west-1 \
  --query 'SecretString' \
  --output text | jq -r '.database_url')

# Test connection
psql "$DATABASE_URL" -c "SELECT 1;" || echo "❌ Database connection failed"

# Check RDS status
aws rds describe-db-instances \
  --region eu-west-1 \
  --query 'DBInstances[*].{Name:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint.Address}'

# Check security groups allow ECS to RDS
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*rds*" \
  --region eu-west-1 \
  --query 'SecurityGroups[*].IpPermissions'
```

---

## 4. **Deployment Issues**

### **🚨 Docker Build Failing**

**Symptoms:**
- Docker build exits with errors
- Missing dependencies in container
- Build works locally but fails in CI

**Common Build Fixes:**
```bash
# Clear Docker cache
docker system prune -a -f

# Build with no cache
docker build --no-cache -t scalemap-api:test -f server/Dockerfile .

# Check .dockerignore
cat server/.dockerignore
# Should exclude: node_modules, .git, *.log, .env

# Verify build context size
du -sh . | head -1
# Should be < 100MB (excluding node_modules)
```

**Memory Issues:**
```bash
# Build with limited memory
docker build --memory=2g -t scalemap-api:test -f server/Dockerfile .

# Multi-stage build optimization
docker build --target=builder -t scalemap-api:builder -f server/Dockerfile .
docker images scalemap-api:builder  # Should be smaller
```

### **🚨 ECR Push Failures**

**Symptoms:**
- "no basic auth credentials" error
- "repository does not exist" error
- Push times out

**Immediate Fix:**
```bash
# Re-authenticate with ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin 884337373956.dkr.ecr.eu-west-1.amazonaws.com

# Verify repository exists
aws ecr describe-repositories \
  --repository-names scalemap-api \
  --region eu-west-1 || \
  aws ecr create-repository \
    --repository-name scalemap-api \
    --region eu-west-1

# Check image size
docker images scalemap-api:latest
# If > 1GB, optimize Dockerfile

# Test push
docker push 884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api:latest
```

### **🚨 ECS Deployment Stuck**

**Symptoms:**
- ECS deployment shows "IN_PROGRESS" for > 10 minutes
- Tasks start then immediately stop
- "Service failed to reach steady state"

**Immediate Actions:**
```bash
# Check deployment events
aws ecs describe-services \
  --cluster scalemap-cluster \
  --services ApiService \
  --region eu-west-1 \
  --query 'services[0].events[0:5]'

# Check task definition
aws ecs describe-task-definition \
  --task-definition $(aws ecs describe-services \
    --cluster scalemap-cluster \
    --services ApiService \
    --region eu-west-1 \
    --query 'services[0].taskDefinition' \
    --output text) \
  --region eu-west-1 \
  --query 'taskDefinition.{CPU:cpu,Memory:memory,ContainerDefinitions:containerDefinitions[0].{Image:image,Memory:memory,CPU:cpu}}'

# Force stop stuck deployment
aws ecs update-service \
  --cluster scalemap-cluster \
  --service ApiService \
  --desired-count 0 \
  --region eu-west-1

# Wait, then restart
sleep 30
aws ecs update-service \
  --cluster scalemap-cluster \
  --service ApiService \
  --desired-count 1 \
  --region eu-west-1
```

---

## 5. **Build Issues**

### **🚨 Frontend Build Errors**

**Symptoms:**
- Vite build fails
- TypeScript compilation errors
- Missing environment variables in build

**Common Fixes:**
```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install

# Check TypeScript configuration
npx tsc --noEmit

# Verify environment variables
echo "Checking Vite env vars:"
env | grep VITE_

# Build with verbose output
npm run build -- --debug

# Check for missing dependencies
npm ls | grep UNMET
```

### **🚨 Dependencies Missing in Production**

**Symptoms:**
- App works in development but fails in production
- "Module not found" errors in production
- Performance issues in production build

**Immediate Fix:**
```bash
# Check production dependencies
npm ls --production

# Verify all imports exist
npm run build 2>&1 | grep -i "error\|failed"

# Check bundle size
du -sh dist/
ls -la dist/assets/

# Test production build locally
npm run build
npm run start
curl http://localhost:5000/health
```

---

## 6. **Network & Connectivity Issues**

### **🚨 CORS Errors**

**Symptoms:**
- Frontend can't connect to backend
- "CORS policy" errors in browser console
- Preflight request failures

**Immediate Fix:**
```bash
# Check current CORS configuration
curl -I -X OPTIONS \
  -H "Origin: https://d2nr28qnjfjgb5.cloudfront.net" \
  -H "Access-Control-Request-Method: POST" \
  http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/api/health

# Should return Access-Control-Allow-Origin header

# Check server CORS config in code
grep -n "cors" server/index.ts
```

**If CORS headers missing, update server:**
```typescript
// In server/index.ts
const corsOptions = {
  origin: [
    'https://d2nr28qnjfjgb5.cloudfront.net',
    'https://app.scalemap.com',
    'https://staging.scalemap.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : ''
  ].filter(Boolean),
  credentials: true,
  maxAge: 86400
};
```

### **🚨 Load Balancer Issues**

**Symptoms:**
- Intermittent 502/503 errors
- Backend health checks failing
- Requests timing out

**Diagnostic:**
```bash
# Check ALB target group health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names scalemap-api-tg \
    --region eu-west-1 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) \
  --region eu-west-1

# Check health check configuration
aws elbv2 describe-target-groups \
  --names scalemap-api-tg \
  --region eu-west-1 \
  --query 'TargetGroups[0].{HealthCheckPath:HealthCheckPath,HealthCheckProtocol:HealthCheckProtocol,HealthCheckIntervalSeconds:HealthCheckIntervalSeconds}'
```

---

## 7. **Emergency Procedures**

### **🚨 Complete System Failure**

**Immediate Recovery Steps:**
```bash
# 1. Rollback to last known good version
export LAST_GOOD_VERSION="v20250928-143022"  # Update with actual version

# 2. Rollback backend
aws ecs update-service \
  --cluster scalemap-cluster \
  --service ApiService \
  --task-definition scalemap-api-task:LATEST \
  --region eu-west-1

# 3. Rollback frontend
docker pull 884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api:$LAST_GOOD_VERSION
docker create --name emergency-frontend 884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api:$LAST_GOOD_VERSION
docker cp emergency-frontend:/app/dist/public ./emergency-frontend
docker rm emergency-frontend

aws s3 sync ./emergency-frontend s3://scalemap-frontend-prod-884337373956/ --delete
aws cloudfront create-invalidation --distribution-id E1OGYBMF9QDMX9 --paths "/*"

# 4. Verify recovery
sleep 60
curl -f http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/health
curl -f https://d2nr28qnjfjgb5.cloudfront.net/
```

### **🚨 Data Loss Prevention**

**Before any major changes:**
```bash
# 1. Backup database
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Document current state
echo "Backup created at $(date)" > current-state.log
aws ecs describe-services --cluster scalemap-cluster --services ApiService --region eu-west-1 >> current-state.log
curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt >> current-state.log

# 3. Test rollback procedure
echo "Test rollback before emergency"
```

---

## 8. **Monitoring Commands**

### **System Health Check**
```bash
#!/bin/bash
# health-check.sh - Comprehensive system status

echo "🏥 ScaleMap Health Check - $(date)"
echo "=================================="

# Backend Health
echo "🔧 Backend Status:"
if curl -s -f http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/health > /dev/null; then
    echo "✅ Backend API responding"
    curl -s http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/health | jq .
else
    echo "❌ Backend API not responding"
fi

# Frontend Health
echo "🎨 Frontend Status:"
if curl -s -f https://d2nr28qnjfjgb5.cloudfront.net/ > /dev/null; then
    echo "✅ Frontend responding"
    FRONTEND_VERSION=$(curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt 2>/dev/null | head -1)
    echo "Frontend version: $FRONTEND_VERSION"
else
    echo "❌ Frontend not responding"
fi

# ECS Status
echo "🐳 ECS Status:"
aws ecs describe-services \
  --cluster scalemap-cluster \
  --services ApiService \
  --region eu-west-1 \
  --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}'

# Database Status
echo "🗄️ Database Status:"
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database responding"
else
    echo "❌ Database connection failed"
fi

echo "=================================="
echo "Health check complete"
```

---

## 📋 **Troubleshooting Checklist**

### **When Something Breaks:**
1. **🔍 Identify:** What exactly is failing?
2. **📊 Check logs:** ECS logs, CloudWatch, browser console
3. **🔄 Try quick fixes:** Cache clear, restart service
4. **📞 Emergency rollback:** If users affected
5. **🐛 Debug root cause:** After service restored
6. **📝 Document:** Add solution to this guide

### **Before Calling for Help:**
- [ ] Checked this troubleshooting guide
- [ ] Verified current deployed versions
- [ ] Checked CloudWatch logs
- [ ] Tried basic restart/cache clear
- [ ] Documented exact error messages
- [ ] Noted when issue started

### **Information to Provide:**
- Exact error messages
- Current deployed versions (backend/frontend)
- Recent changes made
- CloudWatch log excerpts
- Steps already attempted

---

**Changelog:**
- 2025-09-29: Fixed .dockerignore location issue preventing VITE_API_URL embedding
- 2025-09-29: Added VITE_BUILD_VERSION to Dockerfile ARG and RUN commands
- 2025-09-29: Corrected Cognito Client ID to 6e7ct8tmbmhgvva2ngdn5hi6v1 across all docs
- 2025-09-29: Added authentication flow issues (race conditions, hard redirects, API endpoint)
- 2025-09-29: Added VITE_API_URL Docker build embedding issue
- 2025-09-29: Initial troubleshooting guide created with proven solutions