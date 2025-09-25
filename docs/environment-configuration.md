# Environment Configuration Documentation

**Date:** 2025-09-22
**Purpose:** Document current Replit environment for AWS migration preparation

## Current Technology Stack

### Frontend Dependencies
- **React:** ^18.3.1
- **TypeScript:** 5.6.3
- **Vite:** ^5.4.20 (Build tool)
- **Tailwind CSS:** ^3.4.17
- **Radix UI Components:** Comprehensive set (accordion, dialog, dropdown, etc.)
- **Wouter:** ^3.3.5 (Routing)
- **React Query:** ^5.60.5 (@tanstack/react-query)
- **React Hook Form:** ^7.55.0
- **Framer Motion:** ^11.13.1

### Backend Dependencies
- **Node.js/Express:** ^4.21.2
- **TypeScript:** 5.6.3
- **Authentication:**
  - `openid-client`: ^6.8.0 (Replit OpenID - TO BE REPLACED)
  - `passport`: ^0.7.0
  - `passport-local`: ^1.0.0
- **Database:**
  - `@neondatabase/serverless`: ^0.10.4 (TO BE REPLACED with standard pg client)
  - `drizzle-orm`: ^0.39.1
  - `drizzle-kit`: ^0.31.4
- **File Storage:**
  - `@google-cloud/storage`: ^7.17.1 (TO BE REPLACED with AWS S3)
- **Session Management:**
  - `express-session`: ^1.18.1
  - `connect-pg-simple`: ^10.0.0
  - `memorystore`: ^1.6.7

### Integration Dependencies
- **OpenAI:** ^5.22.0 (AI analysis pipeline)
- **Stripe:** ^18.5.0 (Payment processing)
- **WebSocket:** `ws`: ^8.18.0

### Development Tools
- **Build:** `esbuild`: ^0.25.0
- **Dev Server:** `tsx`: ^4.20.5
- **Replit-specific:**
  - `@replit/vite-plugin-cartographer`: ^0.3.1
  - `@replit/vite-plugin-dev-banner`: ^0.1.1
  - `@replit/vite-plugin-runtime-error-modal`: ^0.0.3

## Critical File Locations

### Authentication Files
- **Current:** `server/replitAuth.ts` (Replit OpenID integration)
- **Migration Target:** AWS Cognito integration

### Storage Files
- **Current:** `server/objectStorage.ts` (Google Cloud Storage)
- **Migration Target:** AWS S3 integration
- **ACL Management:** `server/objectAcl.ts` (permissions management)

### Database Files
- **Connection:** `server/db.ts` (Neon serverless connection)
- **Schema:** `shared/schema.ts` (Drizzle ORM schema definitions)
- **Migration Target:** Standard PostgreSQL client for RDS

### Core Application Files
- **Server Entry:** `server/index.ts`
- **OpenAI Integration:** `server/openai.ts` (AI analysis pipeline)
- **Data Seeders:** `server/agentSeeder.ts`, `server/questionSeeder.ts`

## Environment Variables (Structure Only - No Values)

### Current Replit Environment Variables Required:
```bash
# Database
DATABASE_URL=postgresql://[neon-connection-string]

# Authentication (Replit OpenID)
OPENID_CLIENT_ID=[replit-client-id]
OPENID_CLIENT_SECRET=[replit-client-secret]
OPENID_ISSUER=[replit-issuer-url]

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=[gcs-project-id]
GOOGLE_CLOUD_KEYFILE=[path-to-service-account-json]
GOOGLE_CLOUD_BUCKET=[gcs-bucket-name]

# OpenAI
OPENAI_API_KEY=[openai-api-key]

# Stripe
STRIPE_SECRET_KEY=[stripe-secret-key]
STRIPE_PUBLISHABLE_KEY=[stripe-publishable-key]

# Session
SESSION_SECRET=[session-secret-key]

# Application
NODE_ENV=production|development
PORT=3000
```

### AWS Migration Environment Variables Mapping:
```bash
# Database (RDS PostgreSQL)
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/scalemap

# Authentication (AWS Cognito)
COGNITO_USER_POOL_ID=eu-west-1_xxxxx
COGNITO_CLIENT_ID=xxxxx

# AWS Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx

# Storage (S3)
S3_BUCKET_NAME=scalemap-storage

# Keep unchanged
OPENAI_API_KEY=[same-value]
STRIPE_SECRET_KEY=[same-value]
STRIPE_PUBLISHABLE_KEY=[same-value]
SESSION_SECRET=[same-value]
NODE_ENV=production|development
PORT=3000
```

## Database Configuration

### Current Neon Database Setup
- **Driver:** `@neondatabase/serverless` with WebSocket support
- **ORM:** Drizzle ORM with neon-serverless adapter
- **Connection:** Serverless WebSocket connection
- **SSL:** Automatic via Neon

### Migration to RDS Setup
- **Driver:** Standard `pg` (PostgreSQL client)
- **ORM:** Drizzle ORM with node-postgres adapter
- **Connection:** Traditional connection pooling
- **SSL:** Manual configuration for production

## File Storage Configuration

### Current Google Cloud Storage Setup
- **Library:** `@google-cloud/storage`
- **Authentication:** Service account JSON key file
- **Bucket:** Single bucket with ACL permissions
- **Access Patterns:** Direct upload/download with signed URLs

### Migration to S3 Setup
- **Library:** `@aws-sdk/client-s3`
- **Authentication:** IAM credentials (Access Key + Secret)
- **Bucket:** S3 bucket with IAM policies
- **Access Patterns:** Presigned URLs for secure access

## Build Configuration

### Current Replit Build Process
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  }
}
```

### Replit-Specific Configurations to Remove
- Remove `@replit/vite-plugin-*` dependencies
- Update Vite config to remove Replit plugins
- Modify build process for standard Node.js deployment

## Migration Readiness Assessment

### ✅ Completed Setup Tasks
- [x] Codebase cloned and verified locally
- [x] Dependencies installed and TypeScript compilation tested
- [x] AWS CLI v2.0.30 installed and configured with eu-west-1 region
- [x] AWS SDK dependencies installed (@aws-sdk/client-s3, amazon-cognito-identity-js)
- [x] AWS connectivity verified (account: 884337373956, user: scalemap-service)

### ⏳ Pending Setup Tasks
- [ ] PostgreSQL local installation for development testing
- [ ] Neon database backup extraction
- [ ] Google Cloud Storage file backup
- [ ] AWS testing environment provisioning

### 🔧 Code Migration Requirements
1. **Authentication Migration:** Replace `server/replitAuth.ts` with Cognito integration
2. **Storage Migration:** Replace `server/objectStorage.ts` with S3 implementation
3. **Database Migration:** Update `server/db.ts` for standard PostgreSQL client
4. **Environment Variables:** Update all environment variable references
5. **Build Configuration:** Remove Replit-specific plugins and dependencies

## Next Steps for AWS Migration

### Phase 1: Infrastructure (Week 1)
- Provision RDS PostgreSQL instance (db.t3.micro, 20GB)
- Create S3 bucket with proper IAM policies
- Set up Cognito User Pool
- Configure Elastic Beanstalk environment

### Phase 2: Code Migration (Week 2)
- Update authentication system to use Cognito
- Migrate file storage to S3 with presigned URLs
- Update database client to standard PostgreSQL
- Test all integrations in AWS environment

### Phase 3: Data Migration (Week 3)
- Export and import database from Neon to RDS
- Migrate files from GCS to S3 with metadata preservation
- Update DNS and go live with monitoring

## Cost Monitoring Setup
- **AWS Account:** 884337373956
- **Free Tier Limits:** RDS 750hrs/month, S3 5GB, Cognito 50K MAUs
- **Budget Alerts:** Set at $20, $50, $100 (within $120 credit limit)
- **Estimated Monthly Cost:** $15-30 within Free Tier limits

---

**Document Created:** 2025-09-22 by James (Dev Agent)
**Last Updated:** 2025-09-22
**Status:** Initial documentation complete, ready for migration planning