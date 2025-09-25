# Bug Log - ScaleMap Production Issues

**Purpose**: Track frontend/backend bugs discovered during Phase 1 UAT and production use

---

## Active Bugs

### UAT-1.1.1: CloudFront Cognito Configuration Error (REOPENED)
**Status**: In Progress
**Severity**: Critical
**Reported**: 2025-09-24
**Reopened**: 2025-09-24
**Environment**: Production CloudFront (https://d2nr28qnjfjgb5.cloudfront.net/)

**Description**:
Frontend still displays blank screen with Cognito initialization error despite Docker image v1.1 deployment

**Steps to Reproduce**:
1. Navigate to https://d2nr28qnjfjgb5.cloudfront.net/
2. Observe blank screen
3. Check browser console for error

**Evidence**:
```
Uncaught Error: Both UserPoolId and ClientId are required.
    at new t (index-DHjox7mF.js:264:169)
    at index-DHjox7mF.js:270:1547
```

**Root Cause Analysis**:
1. ✅ Docker image v1.1 built successfully WITH Cognito environment variables embedded via ARG/ENV
2. ✅ ECS task definition updated to v1.1 and deployed
3. ✅ CloudFront cache invalidated
4. ❌ **ACTUAL ISSUE**: CloudFront serves static files from S3 bucket, NOT from ECS container
   - CloudFront has 2 origins: S3 (scalemap-frontend-prod-884337373956) + ALB (ECS)
   - Default cache behavior targets S3 origin (ScalemapFrontendStackFrontendDistributionOrigin1AC545EEA)
   - S3 bucket contains OLD frontend build without Cognito vars
   - Docker v1.1 image has NEW frontend build but it's inside the container at `/app/dist/public/`

**Architecture Gap**:
The deployment process builds frontend inside Docker image but never extracts it to S3. CloudFront continues serving stale S3 content.

**Fix Strategy** (PENDING DEV DISCUSSION):

**Environment Context**:
- CodeBuild is used for Docker builds (no local Docker Desktop available)
- CloudFront Distribution ID: `E1OGYBMF9QDMX9`
- S3 Bucket: `scalemap-frontend-prod-884337373956`
- Current buildspec.yml: Builds frontend inside Docker, pushes to ECR, but never extracts to S3

**Recommended Fix: Update CodeBuild Pipeline**
Modify `buildspec.yml` post_build phase to extract frontend from Docker image and upload to S3:

```yaml
post_build:
  commands:
    - echo Build completed on `date`

    # Extract frontend from Docker image
    - echo "Extracting frontend from Docker image..."
    - docker create --name frontend-temp $REPOSITORY_URI:$IMAGE_TAG
    - docker cp frontend-temp:/app/dist/public ./frontend-dist
    - docker rm frontend-temp
    - ls -la ./frontend-dist

    # Upload to S3
    - echo "Uploading frontend to S3..."
    - aws s3 sync ./frontend-dist s3://scalemap-frontend-prod-884337373956/ --delete

    # Invalidate CloudFront cache
    - echo "Invalidating CloudFront cache..."
    - aws cloudfront create-invalidation --distribution-id E1OGYBMF9QDMX9 --paths "/*"

    # Push Docker images (existing)
    - echo Pushing the Docker images...
    - docker push $REPOSITORY_URI:$IMAGE_TAG
    - docker push $REPOSITORY_URI:latest
    - echo Writing image definitions file...
    - printf '[{"name":"ApiContainer","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json
    - cat imagedefinitions.json
```

**Implementation Steps**:
1. Update `buildspec.yml` with above post_build commands
2. Commit changes to repository
3. Trigger new CodeBuild run (will build v1.2 with frontend extraction)
4. Verify S3 bucket updated with new frontend files
5. Verify CloudFront serves updated frontend with Cognito config
6. Test user registration/login flow

**Alternative Considered**: Change CloudFront to serve static from ALB
- ❌ Rejected: Adds unnecessary load to ECS, defeats CDN purpose, increases costs

**CodeBuild IAM Permissions Required**:
- ✅ `ecr:*` (already working)
- ✅ `s3:PutObject` on scalemap-frontend-prod-884337373956 (verify)
- ✅ `cloudfront:CreateInvalidation` on E1OGYBMF9QDMX9 (verify)

**Fix Story**: [Story 1.4](../stories/1.4.story.md) (in progress)
**Assigned To**: Dev Agent + Architect (Winston)
**Next Steps**: Review buildspec.yml changes with dev team, verify IAM permissions, execute CodeBuild deployment

---

## Bug Statistics

**Total Bugs**: 1
**Critical**: 1
**High**: 0
**Medium**: 0
**Low**: 0

**Fixed**: 0
**In Progress**: 1
**New**: 0

---

## Resolved Bugs Archive

### UAT-1.1.1-INITIAL: CloudFront Cognito Configuration - Initial Investigation
**Status**: Superseded by UAT-1.1.1
**Severity**: Critical
**Reported**: 2025-09-24
**Environment**: Production CloudFront (https://d2nr28qnjfjgb5.cloudfront.net/)

**Initial Root Cause (INCOMPLETE)**:
Vite environment variables not passed to Docker build - partially correct but missed S3 deployment gap

**Partial Fix Attempted**:
1. Updated `server/Dockerfile` with ARG/ENV for Cognito vars
2. Modified `buildspec.yml` with --build-arg flags
3. Built v1.1 image to ECR
4. Updated ECS to v1.1
5. Invalidated CloudFront

**Why It Failed**:
Fixed Docker build but didn't update S3 bucket that CloudFront actually serves from

---

**Last Updated**: 2025-09-24
**Maintained By**: Quinn (QA) + Development Team