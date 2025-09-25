# Bug Fix Workflow Guide
**Quick Reference for Finding, Logging, and Fixing Production Issues**

---

## 🔍 Step 1: Discover & Log Bug

### When Testing Frontend (https://d2nr28qnjfjgb5.cloudfront.net)

**Open Browser DevTools**:
1. Right-click → Inspect → Console tab
2. Check for red error messages
3. Network tab → Look for failed requests (red status codes)
4. Note exact error message and request URL

**Document in Bug Log**:
```bash
# Create new bug entry in docs/qa/bug-log.md
BUG-{TODAY}-{NNN}: {What's broken}
Severity: Critical/High/Medium/Low
UAT Test: {Which test from phase1-uat-plan.md}
Steps to reproduce: 1, 2, 3...
Error message: {exact text from console}
```

**Severity Guide**:
- **Critical**: App unusable, cannot register/login/submit
- **High**: Major feature broken, affects core workflow
- **Medium**: Feature partially broken, workaround exists
- **Low**: UI issue, performance degradation, minor bug

---

## 🎯 Step 2: Triage & Prioritize

### Critical/High Bugs → Immediate Fix
Use BMad Scrum Master to create fix story:

```bash
# Switch to Scrum Master agent
*agent sm

# Create bug fix story
*draft
```

**Story will include**:
- Root cause analysis
- Fix implementation tasks
- Regression test to prevent recurrence
- Acceptance criteria for validation

### Medium/Low Bugs → Sprint 2 Backlog
- Add to bug log with "Status: New"
- Discuss in sprint planning
- May be grouped into batch fix stories

---

## 🛠️ Step 3: Implement Fix

### Use Developer Agent

```bash
# Switch to Developer agent
*agent dev

# Point to bug fix story
# Agent will:
# 1. Read the story
# 2. Analyze root cause
# 3. Implement fix
# 4. Write tests
# 5. Validate solution

*develop-story
```

**Common Fix Patterns**:

1. **Missing Environment Variable**
   - Location: `infrastructure/lib/stacks/compute.ts`
   - Add to ECS task definition environment/secrets
   - Redeploy stack

2. **CORS Error**
   - Location: `server/index.ts` (Express CORS middleware)
   - Add CloudFront origin to allowed origins
   - Redeploy API container

3. **Database Connection**
   - Location: `server/db.ts`
   - Check DATABASE_URL secret format
   - Verify SSL configuration

4. **Frontend Build Issue**
   - Location: `client/` directory
   - Rebuild: `npm run build`
   - Redeploy to S3: Update frontend stack

---

## ✅ Step 4: Verify Fix

### Re-run Failed UAT Test
```bash
# Open docs/qa/phase1-uat-plan.md
# Find the UAT test that failed (e.g., UAT-1.3.2)
# Execute test steps manually
# Update checklist: ❌ → ✅
```

### Update Bug Log
```bash
# In docs/qa/bug-log.md
Status: New → Fixed
Fix Story: {link to story file}
Resolution: {brief description of fix}
Verified: {date} by {name}
```

### Check for Regressions
- Run all related UAT tests
- Monitor CloudWatch for new errors
- Test on different browsers if UI fix

---

## 📊 Monitoring & Prevention

### After Each Fix
1. **Update Bug Statistics** in bug-log.md
2. **Add Regression Test** to prevent recurrence
3. **Document Pattern** if common issue (add to this guide)

### Weekly Review
- Review open bugs with team
- Identify patterns (e.g., "all CORS issues")
- Create preventive stories for Sprint 2

---

## 🚀 Quick Commands Reference

### Finding Bugs
```bash
# Test API health
curl http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/api/health

# Check CloudWatch logs
aws logs tail /ecs/scalemap-api --follow

# Check ECS task status
aws ecs describe-services --cluster scalemap-cluster --services scalemap-api-service
```

### Creating Fix Stories
```bash
*agent sm          # Switch to Scrum Master
*draft             # Create new story
```

### Implementing Fixes
```bash
*agent dev         # Switch to Developer
*develop-story     # Implement the fix
```

### Validating Fixes
```bash
# Re-run integration tests
npm run test:integration

# Check deployment
cdk deploy --all
```

---

## 📋 Bug Fix Story Template

When Scrum Master creates fix story, it should include:

```yaml
Story: Fix {bug description}

Acceptance Criteria:
1. {Bug no longer reproducible}
2. {Regression test added}
3. {UAT test passes}

Tasks:
- [ ] Analyze root cause
- [ ] Implement fix in {file/location}
- [ ] Add regression test
- [ ] Deploy fix
- [ ] Verify UAT test passes
- [ ] Update bug log (Status: Fixed)

Root Cause:
{Technical explanation from bug log}

Testing:
- Unit test: {test file}
- Integration test: {test file}
- Manual verification: {UAT test ID}
```

---

## 🆘 Emergency Procedures

### Critical Production Bug (App Down)

1. **Immediate Action**
   ```bash
   # Check ECS service health
   aws ecs describe-services --cluster scalemap-cluster --services scalemap-api-service

   # Check task logs
   aws logs tail /ecs/scalemap-api --follow

   # Rollback if needed (to previous task definition)
   aws ecs update-service --cluster scalemap-cluster --service scalemap-api-service --task-definition scalemap-api:{previous-revision}
   ```

2. **Notify Team**
   - Create bug entry: `BUG-{date}-CRITICAL-{desc}`
   - Slack/email team immediately
   - Document incident timeline

3. **Root Cause Analysis**
   - After service restored, create RCA document
   - Use `/BMad:agents:sm` to create post-mortem story
   - Add preventive measures to backlog

---

**Document Owner**: Quinn (QA) + Bob (Scrum Master)
**Last Updated**: 2025-09-24
**Version**: 1.0