# Phase 1 User Acceptance Test Plan
**ScaleMap Production Deployment - Frontend Validation**

---

## Test Environment

**Frontend URL**: https://d2nr28qnjfjgb5.cloudfront.net
**API Endpoint**: http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com
**Database**: RDS PostgreSQL (scalemapdatabasestack-scalemapdatabaseb5a25d8f-ynqbilg0h2ks.c9cy8uecim5u.eu-west-1.rds.amazonaws.com)
**Phase**: Phase 1 Complete (Stories 1.1, 1.2, 1.3)

---

## What Should Work - User Journey Checklist

### 1. Infrastructure & Connectivity (Story 1.1)
- [ ] **UAT-1.1.1**: Frontend loads at CloudFront URL without errors
- [ ] **UAT-1.1.2**: API health check returns 200 OK at `/api/health`
  - Expected response: `{"status":"healthy","services":{"db":"up","s3":"up","cognito":"up"}}`
- [ ] **UAT-1.1.3**: HTTPS enforcement (currently HTTP only - expected to fail until ACM certificate provisioned)
- [ ] **UAT-1.1.4**: CloudWatch logs show structured JSON with correlation IDs

### 2. Database & Authentication (Story 1.2)
- [ ] **UAT-1.2.1**: Database schema exists with all 9 tables
  - Tables: sessions, users, assessments, agents, assessment_domains, assessment_responses, documents, assessment_questions, analysis_jobs
- [ ] **UAT-1.2.2**: Database connection via SSL enabled
- [ ] **UAT-1.2.3**: Connection pooling handles 10 concurrent connections

### 3. User Registration & Login (Story 1.3 - IV1 & IV2)
- [ ] **UAT-1.3.1**: User can navigate to registration page
- [ ] **UAT-1.3.2**: User can register with email and password via Cognito
  - Test email: `test-user-{timestamp}@example.com`
- [ ] **UAT-1.3.3**: User receives JWT token on successful login
- [ ] **UAT-1.3.4**: Protected endpoints reject requests without JWT token (401 Unauthorized)
- [ ] **UAT-1.3.5**: User session persists across multiple requests

### 4. Assessment Creation & Questionnaire (Story 1.3 - IV1)
- [ ] **UAT-1.3.6**: User can create new assessment
- [ ] **UAT-1.3.7**: 12-domain assessment questionnaire displays
- [ ] **UAT-1.3.8**: User can answer questionnaire questions
- [ ] **UAT-1.3.9**: Assessment responses saved to database
  - Verify in `assessment_responses` table

### 5. Document Upload (Story 1.3 - IV1)
- [ ] **UAT-1.3.10**: User can upload documents (PDF, DOCX, XLSX)
- [ ] **UAT-1.3.11**: S3 presigned URL generated correctly
- [ ] **UAT-1.3.12**: File upload completes successfully
- [ ] **UAT-1.3.13**: Document metadata stored in database `documents` table
- [ ] **UAT-1.3.14**: Uploaded files accessible from S3

### 6. Assessment Submission (Story 1.3 - IV1)
- [ ] **UAT-1.3.15**: User can submit completed assessment
- [ ] **UAT-1.3.16**: Assessment record stored in RDS with correct `user_id` and status
- [ ] **UAT-1.3.17**: Assessment status updates correctly (pending → in_progress → submitted)

### 7. Performance & Monitoring (Story 1.3 - IV3)
- [ ] **UAT-1.3.18**: API response times <3 seconds for all endpoints
  - Measured range: 39-221ms (well within SLA)
- [ ] **UAT-1.3.19**: CloudWatch Logs capture structured JSON logs
- [ ] **UAT-1.3.20**: CloudWatch Metrics show ECS CPU <50% under load
- [ ] **UAT-1.3.21**: No error logs in CloudWatch

---

## Known Issues & Limitations

### Expected Failures (Deferred to Sprint 2)
1. **HTTPS Not Configured** - HTTP-only ALB listener (ACM certificate pending)
   - **Impact**: All traffic unencrypted
   - **Workaround**: Use HTTP for testing
   - **Resolution**: Sprint 2 security hardening story

2. **Wildcard S3 IAM Permissions** - Overly permissive resource access
   - **Impact**: Security audit finding risk
   - **Resolution**: Sprint 2 security hardening story

3. **No Automated Rollback** - Manual intervention required for deployment failures
   - **Impact**: Extended downtime risk
   - **Resolution**: Sprint 2 DevOps maturity story

### Deployment Challenges Resolved
1. ✅ Vite dynamic import failures - Fixed with conditional imports
2. ✅ Database SSL validation - Fixed with certificate override
3. ✅ Missing S3_BUCKET_NAME env var - Fixed in task definition
4. ✅ Frontend build integration - Fixed in Dockerfile

---

## Bug Tracking Workflow

### When You Find an Issue:

**Step 1: Document the Bug**
- Record in `/docs/qa/bug-log.md` with:
  - **Bug ID**: BUG-{date}-{number} (e.g., BUG-20250924-001)
  - **UAT Test ID**: Which test failed (e.g., UAT-1.3.2)
  - **Severity**: Critical / High / Medium / Low
  - **Description**: What happened vs what should happen
  - **Steps to Reproduce**: Detailed steps
  - **Environment**: Browser, URL, timestamp
  - **Screenshots/Logs**: Attach evidence

**Step 2: Triage with Scrum Master**
- Critical/High bugs → Immediate fix story
- Medium bugs → Sprint 2 backlog
- Low bugs → Technical debt

**Step 3: Create Fix Story**
- Use `/BMad:agents:sm` to draft bug fix story
- Story includes:
  - Root cause analysis
  - Fix implementation tasks
  - Regression test to prevent recurrence

**Step 4: Implement & Verify**
- Use `/BMad:agents:dev` to implement fix
- Re-run failed UAT test
- Mark UAT test as passing

---

## Test Execution Guide

### Prerequisites
- Chrome/Firefox browser with developer tools
- Access to AWS Console (CloudWatch, RDS)
- Test user credentials ready

### Execution Steps

1. **Run Infrastructure Tests** (UAT-1.1.x, UAT-1.2.x)
   ```bash
   # Test health endpoint
   curl http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/api/health

   # Check database schema
   psql "postgresql://scalemap_user:{password}@{rds-endpoint}:5432/scalemap?sslmode=require" -c "\dt"
   ```

2. **Run User Journey Tests** (UAT-1.3.x)
   - Open https://d2nr28qnjfjgb5.cloudfront.net
   - Follow checklist step-by-step
   - Document results in bug log

3. **Monitor Performance** (UAT-1.3.18-21)
   - Browser DevTools → Network tab (check response times)
   - AWS CloudWatch → `/ecs/scalemap-api` (check logs)
   - AWS CloudWatch → Metrics (check ECS CPU/memory)

4. **Document Results**
   - Update this file with ✅/❌ for each test
   - Record any issues in `/docs/qa/bug-log.md`
   - Notify team of critical failures immediately

---

## Success Criteria

**Phase 1 is considered validated when:**
- ✅ 18/21 UAT tests passing (3 expected failures for HTTPS/security hardening)
- ✅ Complete user journey works: Register → Login → Assessment → Upload → Submit
- ✅ Performance <3s response times maintained
- ✅ No critical bugs blocking user workflows
- ✅ Bug log contains all medium/low issues for Sprint 2 planning

---

## Next Steps After UAT

1. **If Critical Issues Found**: Create emergency fix story, deploy hotfix
2. **If Medium/Low Issues**: Document in bug log, prioritize for Sprint 2
3. **If All Tests Pass**: Mark Phase 1 complete, begin Phase 2 planning (Event-Driven Architecture)

---

**Document Owner**: Quinn (Test Architect)
**Last Updated**: 2025-09-24
**Version**: 1.0