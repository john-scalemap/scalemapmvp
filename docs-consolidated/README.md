# ScaleMap Deployment & Operations Documentation

**Status:** Authoritative - Replace all other deployment documentation
**Last Updated:** 2025-09-29
**Purpose:** Single source of truth for deployment processes and configuration

## 🚨 **Critical Notice**

This documentation supersedes ALL previous deployment guides, including:
- `deployment-break-fix-analysis.md`
- `deployment-mismatch-analysis.md`
- `aws-ecs-migration-prd.md`
- Any README files in subdirectories

## 📁 **Documentation Structure**

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[deployment-guide.md](./deployment-guide.md)** | **THE** deployment process (Docker-first) | Every deployment |
| **[environment-config.md](./environment-config.md)** | All environment variables & endpoint mappings | Configuration issues |
| **[cognito-config-reference.md](./cognito-config-reference.md)** | Correct Cognito setup (no secret hash) | Authentication issues |
| **[troubleshooting-guide.md](./troubleshooting-guide.md)** | Common issues & proven fixes | When things break |
| **[current-state.md](./current-state.md)** | What's actually deployed right now | Reality check |
| **[version-sync-procedures.md](./version-sync-procedures.md)** | Frontend/backend synchronization | Version mismatch issues |

## 🎯 **Quick Reference**

### **Deployment Commands**
```bash
# Production deployment (Docker-first)
./scripts/deploy-production.sh

# Check what's currently deployed
./scripts/check-deployment-status.sh

# Emergency rollback
./scripts/rollback-deployment.sh
```

### **Common Issues - Quick Fixes**
- **Frontend/Backend version mismatch:** See [version-sync-procedures.md](./version-sync-procedures.md)
- **Cognito secret hash error:** See [cognito-config-reference.md](./cognito-config-reference.md)
- **Docker vs CodeBuild confusion:** See [deployment-guide.md](./deployment-guide.md)

## 📋 **Documentation Standards**

- ✅ **Prescriptive:** Tell exactly what to do, not what might work
- ✅ **Current Reality:** Document what IS deployed, not what we want to deploy
- ✅ **Copy-Paste Ready:** All commands are tested and ready to execute
- ✅ **Error Recovery:** Every process includes rollback procedures

## 🚀 **Getting Started**

1. **First Time Setup:** Read [deployment-guide.md](./deployment-guide.md) sections 1-3
2. **Daily Operations:** Use [deployment-guide.md](./deployment-guide.md) section 4
3. **Issues:** Check [troubleshooting-guide.md](./troubleshooting-guide.md) first

---

**⚠️ Important:** If you find any discrepancies between this documentation and reality, update this documentation immediately and note the change in the relevant file's changelog.