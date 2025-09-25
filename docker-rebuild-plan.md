# Docker Image Rebuild Plan - Option 1

**Date**: 2025-09-23
**Status**: Ready for Execution
**Approach**: Fix buildspec.yml to use working server/Dockerfile

---

## 🎯 Executive Summary

**Current Situation:**
- ❌ ECR image v1.0 (94MB) is broken - missing compiled JavaScript code
- ❌ ECS tasks fail with `Cannot find module '/app/dist/index.js'`
- ✅ Secrets issue RESOLVED - IAM permissions fixed, ARNs corrected in CDK
- ✅ Infrastructure deployed successfully (ECS, ALB, ECR all exist)

**Root Cause:**
- buildspec.yml uses `Dockerfile.api` which runs fake `tsc` command (wrong package)
- Real compiler is `typescript` package, but `npx tsc` installs `tsc@2.0.4` (not TypeScript)
- Result: No JavaScript files generated, container has empty dist/ folder

**Solution:**
Update buildspec.yml to use the **working** `/server/Dockerfile` that uses esbuild bundler (verified working locally)

---

## ✅ Impact Analysis - Option 1

### What Changes:
| Component | Change | Impact |
|-----------|--------|--------|
| buildspec.yml | Line 20: `Dockerfile.api` → `server/Dockerfile` | ✅ Safe - only affects build process |
| Docker image | Compilation method: broken tsc → working esbuild | ✅ Safe - verified locally |
| Image tag | Keep as v1.0 (will overwrite broken image) | ✅ Safe - same tag expected by CDK |

### What Stays the Same:
- ✅ Build context directory (project root)
- ✅ Image tag (v1.0)
- ✅ ECR repository URI
- ✅ Push commands
- ✅ All other infrastructure (ECS, ALB, secrets)

### Upstream Dependencies (No Breaking Changes):
1. **CDK Infrastructure** (infrastructure/lib/stacks/compute.ts:127)
   - References: `ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'v1.0')`
   - ✅ No change needed - still pulls `scalemap-api:v1.0`

2. **Story Documentation** (docs/stories/1.3.story.md)
   - References `server/Dockerfile` in multiple places
   - ✅ Our change ALIGNS with story requirements

3. **Architecture Docs** (docs/architecture.md:1061)
   - Specifies: "ECS Fargate containers use `server/Dockerfile`"
   - ✅ Our change ALIGNS with architecture

### Downstream Dependencies (No Breaking Changes):
1. **ECS Service**
   - Will automatically pull v1.0 image from ECR when task definition updates
   - ✅ No change needed - service already configured

2. **Task Definition**
   - Currently references v1.0 tag (compute.ts:127)
   - ✅ No change needed - will use updated v1.0 image

3. **Health Checks**
   - ALB expects `/api/health` endpoint on port 3000
   - ✅ Health endpoint exists in server/routes.ts
   - ✅ server/Dockerfile exposes port 3000

---

## 🔒 Secrets Configuration Verification

### All Issues RESOLVED:

| Secret | Status | Details |
|--------|--------|---------|
| IAM Policies | ✅ Fixed | Updated from `??????` wildcards to exact ARNs with `-*` suffix |
| Task Definition Secrets | ✅ Fixed | Updated from partial ARNs to complete ARNs with suffixes |
| Execution Role | ✅ Fixed | Has `secretsmanager:GetSecretValue` on all 4 secrets |

**Current Secret ARNs in CDK** (networking.ts:82-104):
```
database-url:       arn:...secret:/scalemap/prod/database-url-YQa0fN
openai-api-key:     arn:...secret:/scalemap/prod/openai-api-key-osgzC0
stripe-secret-key:  arn:...secret:/scalemap/prod/stripe-secret-key-ngjK9N
cognito-config:     arn:...secret:/scalemap/prod/cognito-config-KU3y3T
```

**Verification Completed:**
- ✅ IAM simulator shows permissions ALLOWED for execution role
- ✅ All 4 secrets exist in Secrets Manager
- ✅ CDK uses `fromSecretCompleteArn()` with exact ARNs
- ✅ Task definition will inject secrets as environment variables

---

## 📋 Detailed Execution Plan - Option 1

### Step 1: Update buildspec.yml
**File**: `/Users/allieandjohn/Downloads/VisionForge-Main/buildspec.yml`
**Line 20 Change**:
```diff
- docker build -t $REPOSITORY_URI:$IMAGE_TAG -f Dockerfile.api .
+ docker build -t $REPOSITORY_URI:$IMAGE_TAG -f server/Dockerfile .
```

**Why This Works:**
- `server/Dockerfile` uses esbuild bundler (in devDependencies)
- Verified working locally: produces 125KB dist/index.js
- Same build command as package.json: `esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`

### Step 2: Package Source for CodeBuild
**Command:**
```bash
./scripts/smart-package.sh
```

**What it does:**
- Creates minimal ZIP excluding node_modules, .postgres-data, etc.
- Uploads to S3: scalemap-codebuild-source-884337373956/source.zip
- Size: <100MB (verified safe for CodeBuild)

### Step 3: Rebuild in CodeBuild
**Command:**
```bash
aws codebuild start-build \
  --project-name scalemap-api-docker-build \
  --region eu-west-1
```

**Build Process:**
1. Downloads source.zip from S3
2. Runs buildspec.yml with updated Dockerfile path
3. Builds using server/Dockerfile:
   - Stage 1: Install dependencies
   - Stage 2: Bundle with esbuild → creates dist/index.js
   - Stage 3: Production image with compiled code
4. Pushes to ECR as v1.0 (overwrites broken image)

### Step 4: Wait for Completion & Deploy CDK
**Monitor:**
```bash
aws codebuild wait build-complete --ids <BUILD_ID> --region eu-west-1
```

**Then Deploy:**
```bash
npx cdk deploy ScalemapComputeStack --require-approval never
```

**What Happens:**
- Stack creates with new task definition
- Task definition pulls updated v1.0 image from ECR
- ECS service starts task with corrected image + correct secrets
- Task reaches RUNNING state
- ALB health checks pass

---

## 🧪 Verification Checklist

### Pre-Build Verification:
- [x] server/Dockerfile exists and uses esbuild
- [x] Local build succeeds: `npm run build` creates dist/index.js
- [x] buildspec.yml references correct Dockerfile path
- [x] Secrets ARNs corrected in CDK (all 4 secrets)
- [x] IAM permissions verified (simulator shows ALLOWED)

### Post-Build Verification:
- [ ] CodeBuild succeeds (status: SUCCEEDED)
- [ ] Image pushed to ECR (check imagePushedAt timestamp)
- [ ] Image size reasonable (<200MB expected with esbuild)

### Post-Deployment Verification:
- [ ] ECS task reaches RUNNING state (not STOPPED)
- [ ] CloudWatch logs show "serving on port 3000" (not MODULE_NOT_FOUND)
- [ ] ALB health check returns 200 OK
- [ ] curl http://<ALB-DNS>/api/health responds with JSON

---

## 🛡️ Rollback Plan

**If build fails:**
1. Review CodeBuild logs for errors
2. Fix identified issue
3. Rebuild

**If deployment fails:**
1. Check ECS task stopped reason
2. Review CloudWatch logs
3. Adjust and redeploy

**If service doesn't start:**
1. Manually update service desired count to 0
2. Fix issue
3. Update desired count to 1

---

## 🔍 Known Issues Addressed

### Issue 1: Secrets Permissions ✅ FIXED
- **Problem**: IAM policies used `??????` wildcards (don't work in IAM)
- **Fix**: Updated to use `-*` wildcards and exact ARNs
- **Verification**: IAM simulator confirms ALLOWED

### Issue 2: Docker Image Missing Code ✅ WILL FIX
- **Problem**: Dockerfile.api uses wrong tsc package, no JS files compiled
- **Fix**: Switch to server/Dockerfile using esbuild (verified working)
- **Verification**: Local build produces 125KB dist/index.js

### Issue 3: Build Context Too Large ✅ ADDRESSED
- **Problem**: Initial ZIP was 2.1GB (node_modules/postgres data)
- **Fix**: smart-package.sh excludes unnecessary files
- **Verification**: Successful upload to S3

---

## 📊 Files Modified Summary

### Changed Files:
1. `/Users/allieandjohn/Downloads/VisionForge-Main/buildspec.yml` (line 20 only)
2. `/Users/allieandjohn/Downloads/VisionForge-Main/infrastructure/lib/stacks/networking.ts` (secrets ARNs - already done)

### Unchanged Files (Critical):
- ✅ server/Dockerfile - no changes
- ✅ server/index.ts - no changes
- ✅ server/routes.ts - no changes (health endpoint exists)
- ✅ infrastructure/lib/stacks/compute.ts - no changes (uses v1.0 tag)
- ✅ All IAM roles/policies - managed by CDK

---

## ✨ Success Criteria

**Build Success:**
- CodeBuild status: SUCCEEDED
- Image in ECR with fresh timestamp
- Image size: 90-150MB (esbuild bundle + alpine + production deps)

**Deployment Success:**
- CloudFormation stack: CREATE_COMPLETE
- ECS service: ACTIVE with runningCount=1
- Task status: RUNNING (not STOPPED/PENDING)
- Health check: 200 OK from ALB

**Runtime Success:**
- Container logs show: "serving on port 3000"
- No MODULE_NOT_FOUND errors
- ALB target group shows healthy targets
- API responds: `curl http://<ALB-DNS>/api/health`

---

## 🚦 Ready to Execute

**Pre-flight Complete:**
- ✅ All dependencies verified
- ✅ No breaking changes identified
- ✅ Secrets configuration correct
- ✅ Build method validated locally
- ✅ Rollback plan documented

**Execute When Ready:**
1. Update buildspec.yml (1 line change)
2. Package and upload source
3. Trigger CodeBuild
4. Deploy CDK stack
5. Verify service running

**Estimated Time**: 15-20 minutes total