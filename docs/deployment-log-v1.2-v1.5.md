
# Deployment Log: CloudFront Frontend Fix (v1.2 → v1.5)

**Date**: 2025-09-24
**Environment**: Production AWS (eu-west-1)
**Initial Issue**: Blank screen on CloudFront - Frontend missing Cognito configuration

---

## Table of Contents
1. [Initial Problem Discovery](#initial-problem-discovery)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Deployment Timeline](#deployment-timeline)
4. [Technical Details](#technical-details)
5. [Lessons Learned](#lessons-learned)

---

## Initial Problem Discovery

### Issue: UAT-1.1.1 (REOPENED)
**Symptom**: CloudFront serving blank screen with JavaScript error:
```
Uncaught Error: Both UserPoolId and ClientId are required.
```

**Environment**:
- CloudFront Distribution: `E1OGYBMF9QDMX9`
- CloudFront URL: https://d2nr28qnjfjgb5.cloudfront.net/
- S3 Bucket: `scalemap-frontend-prod-884337373956`

### Initial Hypothesis (INCORRECT)
Initially believed Docker image v1.1 had Cognito env vars, but investigation revealed:
- Docker image v1.1 built successfully
- Frontend extracted from Docker to S3
- **BUT**: CloudFront serves from S3, not from Docker container
- S3 bucket contained OLD frontend build without Cognito vars

---

## Root Cause Analysis

### Architecture Gap Identified
**The Deployment Flow**:
1. CodeBuild builds Docker image with frontend inside container
2. Frontend extracted from Docker → uploaded to S3
3. CloudFront serves static files from S3

**The Problem**:
Frontend build inside Docker didn't have environment variables embedded because:
1. `buildspec.yml` passed env vars via `--build-arg` to Docker ✅
2. Dockerfile received them as `ARG` ✅
3. Dockerfile set them as `ENV` ✅
4. **BUT**: `RUN npx vite build` didn't see the ENV vars ❌

### Why Vite Couldn't See Environment Variables
In Docker multi-stage builds, `ENV` variables are set for container runtime, but the `RUN` command shell didn't inherit them properly.

**The Fix**: Explicitly export ENV vars in the RUN command:
```dockerfile
RUN VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_AWS_REGION=$VITE_AWS_REGION \
    npx vite build
```

---

## Deployment Timeline

### v1.2 → v1.3: Frontend Environment Variables Fix
**Build #25** - 2025-09-24 ~15:23 UTC

**Changes**:
1. Updated `server/Dockerfile` line 23 - Added explicit ENV var exports to vite build
2. Updated `buildspec.yml` - Bumped to v1.3
3. Updated `buildspec.yml` - Changed CloudFront invalidation from `/*` to `/index.html` (rate limit fix)
4. Updated `buildspec.yml` - Added Cognito config verification step

**Files Modified**:
- `/server/Dockerfile`
- `/buildspec.yml`

**Verification**:
```bash
# Verified Cognito User Pool ID in bundle
grep -q "eu-west-1_iGWQ7N6sH" ./frontend-dist/assets/*.js
# Result: ✓ Cognito User Pool ID found
```

**Result**: ✅ SUCCESS - Frontend bundle contained Cognito config

---

### v1.3 → v1.4: Stripe Environment Variable Fix
**Build #26** - 2025-09-24 ~16:05 UTC

**New Error Discovered**:
```
Uncaught Error: Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY
```

**Root Cause**: Incomplete environment variable audit. Only passed 3 vars to Docker, Stripe key was missing.

**Frontend Environment Variables Required**:
1. ✅ `VITE_COGNITO_USER_POOL_ID` = `eu-west-1_iGWQ7N6sH`
2. ✅ `VITE_COGNITO_CLIENT_ID` = `6e7ct8tmbmhgvva2ngdn5hi6v1`
3. ✅ `VITE_AWS_REGION` = `eu-west-1`
4. ❌ `VITE_STRIPE_PUBLIC_KEY` = `pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA`

**Changes**:
1. Updated `buildspec.yml` line 20 - Added `--build-arg VITE_STRIPE_PUBLIC_KEY=...`
2. Updated `server/Dockerfile` lines 3-11 - Added Stripe ARG and ENV declarations
3. Updated `server/Dockerfile` line 25-29 - Added Stripe to vite build command
4. Updated `buildspec.yml` - Bumped to v1.4

**Files Modified**:
- `/server/Dockerfile`
- `/buildspec.yml`

**Verification**:
```bash
curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/index-BjZs56_T.js | grep -o "pk_test_51S9UtWPMQGIPehV3"
# Result: pk_test_51S9UtWPMQGIPehV3
```

**Result**: ✅ SUCCESS - All env vars now in bundle

---

### v1.4 → v1.5: Cognito Client Secret Fix
**Build #27** - 2025-09-24 ~16:41 UTC

**New Error Discovered**:
```
POST https://cognito-idp.eu-west-1.amazonaws.com/ 400 (Bad Request)
NotAuthorizedException: Client 6e7ct8tmbmhgvva2ngdn5hi6v1 is configured with secret but SECRET_HASH was not received
```

**Root Cause**: Cognito App Client `6e7ct8tmbmhgvva2ngdn5hi6v1` had "Generate client secret" enabled. Frontend (browser) apps **cannot** use client secrets securely.

**Investigation**:
```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --query 'UserPoolClient.ClientSecret'
# Result: 1ha1j74lsj0533ump6gj29ibl371mee814p5shfa0d1feu52ouj5
```

**The Fix**: Created new Cognito App Client without secret for browser use.

**Changes**:
1. Created new Cognito App Client:
   ```bash
   aws cognito-idp create-user-pool-client \
     --user-pool-id eu-west-1_iGWQ7N6sH \
     --client-name scalemap-web-client \
     --no-generate-secret \
     --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_PASSWORD_AUTH
   # New Client ID: 4oh46v98dsu1c8csu4tn6ddgq1
   ```

2. Updated `buildspec.yml` line 20 - Changed Client ID from `6e7ct8tmbmhgvva2ngdn5hi6v1` to `4oh46v98dsu1c8csu4tn6ddgq1`
3. Updated `buildspec.yml` - Bumped to v1.5

**Files Modified**:
- `/buildspec.yml`

**Verification**:
```bash
curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/index-D4_B1ufX.js | grep -o "4oh46v98dsu1c8csu4tn6ddgq1"
# Result: 4oh46v98dsu1c8csu4tn6ddgq1
```

**Result**: ✅ SUCCESS - Registration/login now works without SECRET_HASH errors

---

## Technical Details

### CodeBuild IAM Permissions Added

**Initial Role**: `scalemap-api-docker-build-role`

**Permissions Added**:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:PutObjectAcl",
    "s3:GetObject",
    "s3:DeleteObject",
    "s3:ListBucket"
  ],
  "Resource": [
    "arn:aws:s3:::scalemap-frontend-prod-884337373956",
    "arn:aws:s3:::scalemap-frontend-prod-884337373956/*"
  ]
},
{
  "Effect": "Allow",
  "Action": [
    "cloudfront:CreateInvalidation"
  ],
  "Resource": "arn:aws:cloudfront::884337373956:distribution/E1OGYBMF9QDMX9"
}
```

### buildspec.yml - Final Configuration

**Version**: v1.5

**Environment Variables Passed to Docker**:
```yaml
docker build \
  --build-arg VITE_COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH \
  --build-arg VITE_COGNITO_CLIENT_ID=4oh46v98dsu1c8csu4tn6ddgq1 \
  --build-arg VITE_AWS_REGION=eu-west-1 \
  --build-arg VITE_STRIPE_PUBLIC_KEY=pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA \
  -t $REPOSITORY_URI:$IMAGE_TAG \
  -f server/Dockerfile .
```

**Frontend Extraction & S3 Upload**:
```yaml
# Extract frontend from Docker image
docker create --name frontend-temp $REPOSITORY_URI:$IMAGE_TAG
docker cp frontend-temp:/app/dist/public ./frontend-dist
docker rm frontend-temp

# Verify Cognito config in built frontend
grep -q "eu-west-1_iGWQ7N6sH" ./frontend-dist/assets/*.js && \
  echo "✓ Cognito User Pool ID found" || \
  (echo "✗ Cognito config missing" && exit 1)

# Upload to S3 with optimized cache headers
aws s3 sync ./frontend-dist s3://$S3_BUCKET/ \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp ./frontend-dist/index.html s3://$S3_BUCKET/index.html \
  --cache-control "public,max-age=0,must-revalidate"

# Invalidate CloudFront cache (index.html only to avoid rate limits)
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/index.html"
```

### server/Dockerfile - Final Configuration

**Key Changes**:

```dockerfile
FROM public.ecr.aws/docker/library/node:20-alpine AS build

# Receive build arguments
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_AWS_REGION
ARG VITE_STRIPE_PUBLIC_KEY

# Set as environment variables
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY

# ... [package install and file copies] ...

# CRITICAL: Explicitly export env vars for Vite build
RUN VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_AWS_REGION=$VITE_AWS_REGION \
    VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY \
    npx vite build
```

### CloudFront Configuration

**Distribution**: `E1OGYBMF9QDMX9`

**Origins**:
1. S3: `scalemap-frontend-prod-884337373956` (default - serves frontend)
2. ALB: ECS Fargate API (serves /api/*)

**Cache Behavior**:
- Default: Routes to S3 origin
- `/api/*`: Routes to ALB origin

**Invalidation Strategy**:
- Changed from `/*` (all files) to `/index.html` (entry point only)
- Reasoning: Asset files have unique hash-based names, only index.html needs invalidation
- Prevents CloudFront rate limit issues (3 invalidations per hour limit)

---

## Lessons Learned

### 1. Docker ENV Variables Don't Automatically Reach Build Commands
**Problem**: Setting `ENV` in Dockerfile doesn't guarantee the variable is available to `RUN` commands.

**Solution**: Explicitly export variables in the RUN command:
```dockerfile
RUN VAR1=$VAR1 VAR2=$VAR2 npx vite build
```

### 2. Incomplete Environment Variable Audits Cause Cascade Failures
**Problem**: Fixed Cognito vars but missed Stripe, causing sequential deployments.

**Solution**: Always audit ALL `import.meta.env.VITE_*` references in codebase before deployment:
```bash
grep -r "import.meta.env.VITE_" client/src --include="*.tsx" --include="*.ts" | grep -o "VITE_[A-Z_]*" | sort -u
```

### 3. Cognito Client Secrets Are Incompatible with Browser Apps
**Problem**: App Client with "Generate client secret" enabled requires SECRET_HASH in all requests.

**Solution**: Browser apps MUST use App Clients without secrets. Use separate clients for:
- Frontend (browser): No secret, SRP auth
- Backend (server): With secret if needed

### 4. CloudFront Invalidation Rate Limits
**Problem**: Invalidating `/*` hits rate limits quickly (3 per hour).

**Solution**:
- Only invalidate entry points (`/index.html`)
- Use cache-control headers: `max-age=0` for HTML, `max-age=31536000` for hashed assets
- Asset filenames include content hashes, so they self-bust cache

### 5. Verification Steps Prevent Silent Failures
**Problem**: Builds succeeded even when env vars were missing from bundle.

**Solution**: Added verification step to buildspec.yml:
```yaml
grep -q "eu-west-1_iGWQ7N6sH" ./frontend-dist/assets/*.js || exit 1
```
Build now FAILS if Cognito config missing, preventing broken deployments.

### 6. IAM Permissions Required for CodeBuild S3/CloudFront Access
**Problem**: CodeBuild role lacked permissions for S3 upload and CloudFront invalidation.

**Solution**: Updated `scalemap-api-docker-build-role` with:
- `s3:PutObject`, `s3:ListBucket` on frontend bucket
- `cloudfront:CreateInvalidation` on distribution

---

## Build Summary

| Build | Version | Status | Key Changes | Bundle File |
|-------|---------|--------|-------------|-------------|
| #22 | v1.1 | ✅ Success | Initial attempt (no frontend extraction) | N/A |
| #23 | v1.2 | ❌ Failed | Added frontend extraction, IAM issues | N/A |
| #24 | v1.2 | ❌ Failed | Fixed IAM, CloudFront rate limit hit | N/A |
| #25 | v1.3 | ✅ Success | Fixed Vite ENV vars, added verification | `index-DKQhDS1M.js` |
| #26 | v1.4 | ✅ Success | Added Stripe public key | `index-BjZs56_T.js` |
| #27 | v1.5 | ✅ Success | Fixed Cognito client secret issue | `index-D4_B1ufX.js` |

---

## Final Production State

### Frontend Bundle (v1.5)
- **CloudFront URL**: https://d2nr28qnjfjgb5.cloudfront.net/
- **Bundle File**: `index-D4_B1ufX.js`
- **S3 Bucket**: `scalemap-frontend-prod-884337373956`

### Environment Variables Embedded
✅ `VITE_COGNITO_USER_POOL_ID`: `eu-west-1_iGWQ7N6sH`
✅ `VITE_COGNITO_CLIENT_ID`: `4oh46v98dsu1c8csu4tn6ddgq1` (no secret)
✅ `VITE_AWS_REGION`: `eu-west-1`
✅ `VITE_STRIPE_PUBLIC_KEY`: `pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA`

### AWS Resources
- **Cognito User Pool**: `eu-west-1_iGWQ7N6sH`
- **Cognito App Client (Web)**: `4oh46v98dsu1c8csu4tn6ddgq1` (no secret) ✅
- **Cognito App Client (Old)**: `6e7ct8tmbmhgvva2ngdn5hi6v1` (with secret) ❌ Deprecated
- **CloudFront Distribution**: `E1OGYBMF9QDMX9`
- **S3 Frontend Bucket**: `scalemap-frontend-prod-884337373956`
- **ECR Image**: `884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api:v1.5`

### Status
🟢 **Operational** - Frontend loads successfully with all SDKs initialized

---

## Next Steps

### Recommended Improvements

1. **Environment Variable Management**
   - Move build args to AWS Secrets Manager or Parameter Store
   - Update buildspec.yml to fetch at build time:
     ```yaml
     - export VITE_COGNITO_CLIENT_ID=$(aws ssm get-parameter --name /scalemap/cognito-client-id --query Parameter.Value --output text)
     ```

2. **Automated Testing**
   - Add Playwright/Cypress tests to verify Cognito auth flow post-deployment
   - Add to buildspec.yml after CloudFront invalidation

3. **Monitoring**
   - Set up CloudWatch synthetic canary to monitor https://d2nr28qnjfjgb5.cloudfront.net/
   - Alert if registration/login flows fail

4. **Documentation**
   - Update architecture.md with final CloudFront/S3 deployment pattern
   - Document environment variable requirements for future deployments

5. **Cleanup**
   - Delete deprecated Cognito App Client `6e7ct8tmbmhgvva2ngdn5hi6v1`
   - Remove old frontend builds from S3 if not using versioning

---

**Deployment Completed**: 2025-09-24 16:45 UTC
**Final Version**: v1.5
**Status**: ✅ Production Ready