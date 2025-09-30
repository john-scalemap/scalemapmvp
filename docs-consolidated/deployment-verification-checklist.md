# Deployment Verification Checklist

**Purpose:** Ensure every deployment is complete and verified before marking as successful.
**Created:** 2025-09-30
**Last Updated:** 2025-09-30
**Triggered By:** Dashboard deployment incident where backend was not verified

---

## 🚨 **CRITICAL: Complete ALL checks before declaring deployment success**

---

## Quick Reference: The 4 Deployment Killers

These are the most common mistakes that cause failed deployments. Check these FIRST:

1. **⚠️ Platform Mismatch**
   - Docker built for ARM64 (Mac) instead of AMD64 (ECS)
   - Fix: `docker buildx build --platform linux/amd64`
   - Verify: `docker inspect <image> --format='{{.Os}}/{{.Architecture}}'`

2. **⚠️ Wrong Cognito Client ID**
   - Using old client ID with SECRET_HASH enabled
   - MUST USE: `4oh46v98dsu1c8csu4tn6ddgq1`
   - Check: deployment script, .env, task definition, AND built bundle

3. **⚠️ Stale Cache**
   - CloudFront serving old files
   - Fix: Invalidate `/*` (not just specific files)
   - Verify: Test with `curl -H "Cache-Control: no-cache"`

4. **⚠️ Old S3 Files**
   - Mix of old and new files in S3
   - Fix: Use `aws s3 sync --delete` to remove orphaned files
   - Verify: Check version.txt matches deployment tag

---

## Pre-Deployment Verification

### 1. Platform & Architecture Check
- [ ] Verify Docker build uses `--platform linux/amd64` (for ECS AMD64 compatibility)
- [ ] Confirm NOT building for ARM64 (Mac M1/M2 native architecture)
- [ ] Check deployment script line 56: `docker buildx build --platform linux/amd64`

```bash
# Verify platform in deployment script
grep "platform linux/amd64" docs-consolidated/scripts/deploy-production.sh
# Should show: docker buildx build --platform linux/amd64
```

### 2. Cognito Configuration Validation
**CRITICAL: All three locations must use the SAME client ID: `4oh46v98dsu1c8csu4tn6ddgq1`**

- [ ] Check deployment script (line 51): `VITE_COGNITO_CLIENT_ID="4oh46v98dsu1c8csu4tn6ddgq1"`
- [ ] Check `.env` file: `VITE_COGNITO_CLIENT_ID=4oh46v98dsu1c8csu4tn6ddgq1`
- [ ] Check ECS task definition environment variables (if manually created)

```bash
# Verify all three locations
echo "=== Deployment Script ==="
grep "VITE_COGNITO_CLIENT_ID" docs-consolidated/scripts/deploy-production.sh

echo "=== .env File ==="
grep "VITE_COGNITO_CLIENT_ID" .env 2>/dev/null || echo "No .env file (OK if using script defaults)"

echo "=== Current ECS Task Definition ==="
TASK_DEF=$(aws ecs describe-services --cluster scalemap-cluster \
  --services ScalemapComputeStack-ApiServiceC9037CF0-9G3nQxFShJ53 --region eu-west-1 \
  --query 'services[0].taskDefinition' --output text)
aws ecs describe-task-definition --task-definition $TASK_DEF --region eu-west-1 \
  --query 'taskDefinition.containerDefinitions[0].environment[?name==`VITE_COGNITO_CLIENT_ID`]'
```

**RED FLAGS:**
- ❌ Old client IDs that have SECRET_HASH enabled:
  - `39ckvsl8b37n7aufbp1u85emu7`
  - `6e7ct8tmbmhgvva2ngdn5hi6v1`
- ❌ Any mismatch between script, .env, and task definition

### 3. S3 & Cache State Check
- [ ] Verify S3 bucket is correct: `scalemap-frontend-prod-884337373956`
- [ ] Check for stale files in S3 that might not get overwritten
- [ ] Confirm CloudFront cache will be invalidated (script line 120-124)
- [ ] Check for old version.txt that could cause confusion

```bash
# Check S3 current state
echo "=== Current S3 Files ==="
aws s3 ls s3://scalemap-frontend-prod-884337373956/ --recursive | tail -10

echo "=== Current version.txt ==="
aws s3 cp s3://scalemap-frontend-prod-884337373956/version.txt - 2>/dev/null || echo "No version.txt"

echo "=== CloudFront Distribution ==="
aws cloudfront get-distribution --id E1OGYBMF9QDMX9 --query 'Distribution.DomainName' --output text
# Should be: d2nr28qnjfjgb5.cloudfront.net

echo "=== Recent Invalidations ==="
aws cloudfront list-invalidations --distribution-id E1OGYBMF9QDMX9 --max-items 3
```

### 4. Build Configuration Review
- [ ] Check `VITE_API_URL` points to correct backend: `https://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com`
- [ ] Verify all VITE_* environment variables are set in deployment script
- [ ] Confirm no hardcoded old values in source code

```bash
# Check all VITE_* variables in deployment script
grep "export VITE_" docs-consolidated/scripts/deploy-production.sh

# Expected output:
# export VITE_API_URL="https://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com"
# export VITE_BUILD_VERSION="$VERSION_TAG"
# export VITE_COGNITO_USER_POOL_ID="eu-west-1_iGWQ7N6sH"
# export VITE_COGNITO_CLIENT_ID="4oh46v98dsu1c8csu4tn6ddgq1"
# export VITE_AWS_REGION="eu-west-1"
# export VITE_STRIPE_PUBLIC_KEY="pk_test_..."
```

### 5. ECR Image Repository Check
- [ ] Verify ECR repository exists and is accessible
- [ ] Check for disk space issues (too many old images)
- [ ] Consider cleaning old untagged images before deployment

```bash
# Check ECR repository state
echo "=== ECR Repository Images (last 5) ==="
aws ecr describe-images --repository-name scalemap-api --region eu-west-1 \
  --query 'sort_by(imageDetails,&imagePushedAt)[-5:].[imageTags[0],imagePushedAt,imageSizeInBytes]' \
  --output table

echo "=== Untagged Images Count ==="
aws ecr describe-images --repository-name scalemap-api --region eu-west-1 \
  --query 'imageDetails[?imageTags==`null`]' --output json | jq '. | length'
```

---

## During Deployment Checks

### 3. Docker Image Build
```bash
# Verify image built for correct platform
VERSION_TAG="v$(date +%Y%m%d-%H%M%S)-amd64"

# Build command must include:
docker buildx build --platform linux/amd64 \
  --build-arg VITE_COGNITO_CLIENT_ID="4oh46v98dsu1c8csu4tn6ddgq1" \
  ...

# Verify build succeeded
echo "✅ Build completed"
```

- [ ] Docker build completed without errors
- [ ] Build includes `-amd64` suffix in tag
- [ ] All `VITE_*` build args passed correctly

### 4. ECR Image Push
```bash
# Verify image pushed
aws ecr describe-images --repository-name scalemap-api --region eu-west-1 \
  --image-ids imageTag=$VERSION_TAG \
  --query 'imageDetails[0].[imageTags[0],imagePushedAt]'
```

- [ ] Image exists in ECR with correct tag
- [ ] Image push timestamp matches deployment time
- [ ] Image size is reasonable (~100-150MB)

### 5. ECS Task Definition Update
```bash
# Get current task definition
TASK_DEF=$(aws ecs describe-services \
  --cluster scalemap-cluster \
  --services ScalemapComputeStack-ApiServiceC9037CF0-9G3nQxFShJ53 \
  --region eu-west-1 \
  --query 'services[0].taskDefinition' --output text)

# Check image and Cognito ID
aws ecs describe-task-definition --task-definition $TASK_DEF --region eu-west-1 \
  --query 'taskDefinition.containerDefinitions[0].[image,environment]'
```

**CRITICAL CHECKS:**
- [ ] Task definition image tag matches new deployment (e.g., `v20250930-152600-amd64`)
- [ ] Task definition `VITE_COGNITO_CLIENT_ID` = `4oh46v98dsu1c8csu4tn6ddgq1`
- [ ] Task definition registered successfully (new revision number)
- [ ] ECS service updated to use new task definition revision

### 6. ECS Service Deployment
```bash
# Monitor deployment
aws ecs describe-services \
  --cluster scalemap-cluster \
  --services ScalemapComputeStack-ApiServiceC9037CF0-9G3nQxFShJ53 \
  --region eu-west-1 \
  --query 'services[0].deployments[*].[status,runningCount,desiredCount]'
```

- [ ] PRIMARY deployment shows `runningCount=1`
- [ ] No `CannotPullContainerError` in service events
- [ ] No platform mismatch errors (`linux/amd64` vs `linux/arm64`)
- [ ] Task health status transitions to `HEALTHY`

---

## Post-Deployment Verification

### 7. Backend Health Check
```bash
# Test backend endpoint (use -k for self-signed cert)
curl -k https://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/health | jq .
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-30T...",
  "environment": "production",
  "port": "3000"
}
```

- [ ] Backend `/health` endpoint returns HTTP 200
- [ ] Response shows `"status": "healthy"`
- [ ] Environment is `"production"`

### 8. Frontend Deployment to S3
```bash
# Check version file
curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt

# Expected output:
# v20250930-152600-amd64
# Backend: 884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api:v20250930-152600-amd64
# Deployed: 2025-09-30T...
```

- [ ] Frontend version file exists
- [ ] Version matches deployment tag
- [ ] Backend image reference matches ECS task definition

### 9. CloudFront Cache Invalidation
**CRITICAL: Verify cache is completely cleared to avoid serving stale content**

```bash
# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id E1OGYBMF9QDMX9 \
  --query 'InvalidationList.Items[0].[Id,Status,CreateTime]'
```

- [ ] Invalidation created for `/*` (not just specific files)
- [ ] Invalidation status = `Completed`
- [ ] Timestamp matches deployment time

**Cache Verification:**
```bash
# Test with cache-busting headers
curl -I -H "Cache-Control: no-cache" -H "Pragma: no-cache" https://d2nr28qnjfjgb5.cloudfront.net/

# Compare version.txt with and without cache headers
echo "=== With cache-busting ==="
curl -s -H "Cache-Control: no-cache" https://d2nr28qnjfjgb5.cloudfront.net/version.txt

echo "=== Without cache-busting (should match above after invalidation) ==="
curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt
```

- [ ] Both cached and non-cached requests return same version
- [ ] Version matches current deployment tag
- [ ] No HTTP 304 (Not Modified) responses when using no-cache headers

### 10. Frontend Cognito Configuration
```bash
# Verify correct Cognito client in frontend bundle
curl -s https://d2nr28qnjfjgb5.cloudfront.net/ | grep -o 'index-[^"]*\.js' | head -1
# Save JS filename, then check:
curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/<JS-FILE> | grep -c "4oh46v98dsu1c8csu4tn6ddgq1"
# Should return: 1 or more
```

- [ ] Frontend bundle contains correct Cognito Client ID
- [ ] No references to old client IDs (`39ckvsl8b37n7aufbp1u85emu7`, `6e7ct8tmbmhgvva2ngdn5hi6v1`)

### 11. Frontend Dashboard Code
```bash
# Verify dashboard code deployed
curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/<JS-FILE> | grep -c "ScaleMap Dashboard"
# Should return: 1
```

- [ ] Dashboard code present in bundle
- [ ] Dashboard route accessible at `/dashboard`

### 12. End-to-End Functional Test
**Manual Tests (perform in browser):**

1. **Frontend Loads:**
   - [ ] Visit `https://d2nr28qnjfjgb5.cloudfront.net/`
   - [ ] No console errors
   - [ ] Landing page displays correctly

2. **Authentication:**
   - [ ] Login page accessible at `/auth`
   - [ ] No "SECRET_HASH" errors in console
   - [ ] Can attempt login (Cognito connection working)

3. **Dashboard:**
   - [ ] Dashboard accessible at `/dashboard`
   - [ ] "ScaleMap Dashboard" header displays
   - [ ] User info shows in header
   - [ ] "Start New Assessment" button visible (if no active assessment)
   - [ ] API calls to backend succeed (check Network tab)

4. **Backend API:**
   - [ ] Open DevTools Network tab
   - [ ] Verify API requests go to correct endpoint
   - [ ] Verify API returns data (not 500/502 errors)

---

## 🚨 Common Mistakes to Avoid (Lessons Learned)

### 1. ❌ Building for Wrong Architecture
**Mistake:** Building Docker image without `--platform linux/amd64` on Mac M1/M2
**Result:** `CannotPullContainerError: exec format error` in ECS
**Prevention:**
- ✅ ALWAYS use `docker buildx build --platform linux/amd64`
- ✅ Verify architecture with `docker inspect <image> --format='{{.Os}}/{{.Architecture}}'`
- ✅ Deployment script now checks this automatically

### 2. ❌ Wrong Cognito Client ID
**Mistake:** Using old Cognito client IDs that have SECRET_HASH enabled
**Result:** "SECRET_HASH required" errors on login attempts
**Prevention:**
- ✅ ALWAYS use: `4oh46v98dsu1c8csu4tn6ddgq1` (no secret hash)
- ✅ NEVER use: `39ckvsl8b37n7aufbp1u85emu7` or `6e7ct8tmbmhgvva2ngdn5hi6v1`
- ✅ Check ALL three locations: deployment script, .env, task definition
- ✅ Verify in built bundle before pushing to ECR
- ✅ Deployment script now validates this

### 3. ❌ Incomplete CloudFront Cache Invalidation
**Mistake:** Only invalidating specific paths like `/*.html` instead of `/*`
**Result:** Users see old JavaScript bundles with stale code/configs
**Prevention:**
- ✅ ALWAYS invalidate `/*` to clear everything
- ✅ Wait for invalidation to complete before declaring success
- ✅ Test with cache-busting headers: `curl -H "Cache-Control: no-cache"`
- ✅ Deployment script now uses `/*` by default

### 4. ❌ Stale S3 Content Not Overwritten
**Mistake:** Assuming S3 sync will always overwrite old files correctly
**Result:** Mixed old/new files causing runtime errors
**Prevention:**
- ✅ Use `--delete` flag with S3 sync to remove old files
- ✅ Verify version.txt matches deployment tag
- ✅ Check S3 bucket state before deployment
- ✅ Deployment script includes pre-deployment S3 verification

### 5. ❌ Not Verifying Task Definition Image Tag
**Mistake:** Deploying without checking if task definition uses correct image
**Result:** ECS deploys old image version, changes don't appear
**Prevention:**
- ✅ Verify task definition image tag matches newly pushed ECR image
- ✅ Check ECS service events for actual image being used
- ✅ Use forced deployment to ensure pickup: `--force-new-deployment`
- ✅ Deployment script waits for service to stabilize

### 6. ❌ Skipping Build Verification
**Mistake:** Pushing image to ECR without verifying bundle contents
**Result:** Wrong configs deployed, only discovered in production
**Prevention:**
- ✅ Run container locally and grep for expected values
- ✅ Check Cognito Client ID is in bundle
- ✅ Check API endpoint is correct
- ✅ Verify platform architecture
- ✅ Deployment script now includes these checks

---

## Troubleshooting Common Issues

### Issue: "CannotPullContainerError: platform mismatch"
**Cause:** Docker image built for ARM (Mac M1/M2) instead of AMD64 (ECS)
**Fix:**
```bash
docker buildx build --platform linux/amd64 ...
```
**Prevention:** Use updated deployment script with automatic platform verification

### Issue: "CannotPullContainerError: image not found"
**Cause:** Task definition references image tag that doesn't exist in ECR
**Fix:**
1. Check ECR for actual image tags
2. Update task definition with correct tag
3. Re-register task definition
4. Update ECS service with new revision
**Prevention:** Deployment script now verifies ECR access and image count

### Issue: Backend returns "SECRET_HASH required" error
**Cause:** Wrong Cognito Client ID in task definition or frontend bundle
**Fix:**
1. Update task definition environment variable `VITE_COGNITO_CLIENT_ID`
2. Use client without secret: `4oh46v98dsu1c8csu4tn6ddgq1`
3. Re-register and deploy
**Prevention:** Deployment script validates Cognito ID before and after build

### Issue: CloudFront serves old cached content
**Cause:** Cache not invalidated or only partially invalidated
**Fix:**
```bash
aws cloudfront create-invalidation \
  --distribution-id E1OGYBMF9QDMX9 \
  --paths "/*"
```
**Prevention:** Deployment script now invalidates ALL paths and waits for completion

### Issue: S3 has mix of old and new files
**Cause:** S3 sync without --delete flag leaves orphaned old files
**Fix:**
```bash
# Clear S3 bucket completely and re-upload
aws s3 rm s3://scalemap-frontend-prod-884337373956/ --recursive
aws s3 sync ./frontend-dist s3://scalemap-frontend-prod-884337373956/ --delete
```
**Prevention:** Deployment script uses --delete flag by default

---

## Deployment Sign-Off

**Deployment ID:** `______________________________`
**Date/Time:** `______________________________`
**Deployed By:** `______________________________`

**All Checks Passed:** ☐ YES ☐ NO

**If NO, Issues Found:**
```
[List any issues discovered during verification]
```

**Sign-Off:** `______________________________`
**Timestamp:** `______________________________`

---

## Automation Checklist (Future Enhancement)

Items to automate in deployment script:

- [ ] Add post-deployment health check loop
- [ ] Verify task definition image matches pushed image
- [ ] Verify task definition Cognito ID before registering
- [ ] Auto-detect platform and force `--platform linux/amd64`
- [ ] Check CloudFront invalidation completion
- [ ] Verify frontend bundle contains correct Cognito ID
- [ ] Run smoke tests against deployed endpoints
- [ ] Send Slack notification with verification results

---

**Remember:** A deployment is not complete until ALL checks pass. Never skip verification steps.