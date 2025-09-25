# ScaleMap AWS Migration Architecture

**Date:** 2025-09-22
**Version:** 1.0
**Author:** Winston (Architect Agent)

## Executive Summary

This document outlines the migration of ScaleMap from Replit to AWS infrastructure while maintaining all existing functionality. The migration focuses on replacing three core dependencies:

1. **Replit OpenID → AWS Cognito** (Authentication)
2. **Google Cloud Storage → AWS S3** (File Storage)
3. **Neon Database → AWS RDS PostgreSQL** (Database)

**Migration Goals:**
- Zero downtime migration with data preservation
- Cost optimization using AWS Free Tier + $120 credits
- Production-ready scalability for the AI-powered consulting platform
- Maintain existing codebase with minimal changes

---

## Current State Analysis

### Existing Architecture
```
Replit Platform:
├── Node.js/Express Backend (server/)
├── React Frontend (client/)
├── Replit OpenID Authentication
├── Google Cloud Storage (via @google-cloud/storage)
├── Neon PostgreSQL Database
├── Stripe Payment Integration
└── OpenAI API Integration
```

### Critical Dependencies to Replace
- `server/replitAuth.ts` → AWS Cognito integration
- `server/objectStorage.ts` → AWS S3 integration
- `@neondatabase/serverless` → Standard PostgreSQL client for RDS

---

## Target AWS Architecture

### High-Level Architecture Diagram
```mermaid
graph TB
    U[Users] --> CF[CloudFront CDN]
    CF --> EB[Elastic Beanstalk]
    EB --> COG[AWS Cognito]
    EB --> S3[S3 Bucket]
    EB --> RDS[RDS PostgreSQL]
    EB --> OAI[OpenAI API]
    EB --> STR[Stripe API]

    subgraph "AWS Infrastructure"
        EB
        COG
        S3
        RDS
    end
```

### AWS Service Mapping
| **Component** | **Current** | **AWS Target** | **Purpose** |
|---------------|-------------|----------------|-------------|
| Authentication | Replit OpenID | AWS Cognito User Pool | User management & auth |
| File Storage | Google Cloud Storage | S3 + IAM Policies | Document uploads & ACL |
| Database | Neon PostgreSQL | RDS PostgreSQL | Primary data store |
| App Hosting | Replit | Elastic Beanstalk | Node.js app deployment |
| Static Assets | Replit | CloudFront + S3 | CDN for client assets |
| Load Balancer | Replit | Application Load Balancer | Traffic distribution |

---

## Migration Roadmap

### 3-Week Implementation Plan

**Phase 1: Infrastructure Setup (Week 1)**
- [ ] Provision AWS services (RDS, S3, Cognito, Elastic Beanstalk)
- [ ] Configure VPC, security groups, and IAM roles
- [ ] Set up development environment variables
- [ ] Create Cognito User Pool with appropriate settings

**Phase 2: Code Migration (Week 2)**
- [ ] Replace `server/replitAuth.ts` with AWS Cognito integration
- [ ] Replace `server/objectStorage.ts` with S3 implementation
- [ ] Update database client from Neon to standard PostgreSQL
- [ ] Test all existing functionality in AWS environment

**Phase 3: Data Migration & Cutover (Week 3)**
- [ ] Export/import database from Neon to RDS
- [ ] Migrate files from GCS to S3 with metadata preservation
- [ ] Update production environment variables
- [ ] Perform comprehensive end-to-end testing
- [ ] Go-live with monitoring and rollback plan

---

## Critical Migration Risks & Mitigations

### High Risk Areas

**1. Authentication Data Loss**
- **Risk:** User sessions and auth state lost during Cognito migration
- **Mitigation:**
  - Implement dual auth system during transition period
  - Create user mapping script for Replit → Cognito IDs
  - Maintain session store continuity

**2. File Access Disruption**
- **Risk:** Broken file paths when migrating GCS → S3
- **Mitigation:**
  - Update all database file path references before cutover
  - Use S3 presigned URLs for secure access
  - Implement fallback file retrieval mechanism

**3. AI Analysis Pipeline Failures**
- **Risk:** Multi-agent analysis system fails with AWS infrastructure
- **Mitigation:**
  - Test OpenAI API integration thoroughly in AWS environment
  - Verify all environment variables and secrets management
  - Implement robust error handling and retry logic

**4. Cost Overruns**
- **Risk:** AWS costs exceed $120 credit budget
- **Mitigation:**
  - Use Free Tier services (RDS db.t3.micro, S3 5GB, Cognito 50K MAUs)
  - Implement cost monitoring and alerts
  - Right-size resources for MVP traffic

---

## Implementation Details

### 1. AWS Cognito Integration

**Replace server/replitAuth.ts with:**
```typescript
// server/cognitoAuth.ts
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
  UserPoolId: process.env.COGNITO_USER_POOL_ID!,
  ClientId: process.env.COGNITO_CLIENT_ID!
});

export async function authenticateUser(email: string, password: string) {
  // Cognito authentication logic
}
```

**Key Changes:**
- Remove `openid-client` dependency
- Add `amazon-cognito-identity-js`
- Update login/logout routes to use Cognito APIs
- Preserve existing session management with PostgreSQL store

### 2. AWS S3 Integration

**Replace server/objectStorage.ts with:**
```typescript
// server/s3Storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export class S3StorageService {
  async uploadFile(key: string, body: Buffer): Promise<string> {
    // S3 upload implementation
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    // Presigned URL generation
  }
}
```

**Key Changes:**
- Replace `@google-cloud/storage` with `@aws-sdk/client-s3`
- Maintain existing ACL permission model using S3 bucket policies
- Preserve file path structure and naming conventions

### 3. RDS PostgreSQL Setup

**Update server/db.ts:**
```typescript
// server/db.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle(pool, { schema });
```

**Key Changes:**
- Replace `@neondatabase/serverless` with standard `pg` client
- Remove WebSocket constructor configuration
- Add SSL configuration for production RDS connection

---

## AWS Resource Configuration

### Infrastructure as Code (Optional)
```yaml
# aws-infrastructure.yml
Resources:
  CognitoUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: ScaleMapUserPool
      AutoVerifiedAttributes: [email]

  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: scalemap-storage
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true

  RDSInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: db.t3.micro
      Engine: postgres
      AllocatedStorage: 20
```

### Environment Variables Update
```bash
# Replace Replit-specific vars with:
COGNITO_USER_POOL_ID=eu-west-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
S3_BUCKET_NAME=scalemap-storage
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/scalemap
```

---

## Cost Analysis & Budget Management

### AWS Free Tier Usage
| **Service** | **Free Tier Limit** | **Estimated Usage** | **Monthly Cost** |
|-------------|---------------------|---------------------|------------------|
| RDS PostgreSQL | 750 hrs db.t3.micro + 20GB | 720 hrs + 15GB | $0 |
| S3 Storage | 5GB + 20K GET/2K PUT | 3GB + 10K requests | $0 |
| Cognito | 50,000 MAUs | <1,000 MAUs | $0 |
| Elastic Beanstalk | 750 hrs t3.micro | 720 hrs | $0 |
| Data Transfer | 15GB outbound | 5GB | $0 |
| **Total Estimated** | | | **$15-30/month** |

### Post-Free Tier Scaling
- **Month 13+:** ~$45/month with moderate traffic growth
- **At 40+ assessments/month:** ~$120/month (within credit budget)

---

## Success Criteria & Testing

### Migration Validation Checklist
- [ ] All existing users can authenticate via Cognito
- [ ] File uploads/downloads work with S3 integration
- [ ] AI analysis pipeline processes assessments successfully
- [ ] Stripe payment integration remains functional
- [ ] Assessment data integrity maintained
- [ ] 72-hour delivery SLA preserved
- [ ] All 12 domain agents function correctly

### Performance Targets
- **Application Response Time:** < 3 seconds (same as current)
- **File Upload Speed:** Comparable to GCS performance
- **Database Query Performance:** Maintained or improved
- **Overall Uptime:** > 99.5% during migration

---

## Next Steps & Immediate Actions

### Pre-Migration Setup
1. **AWS Account Preparation**
   - Verify $120 credit availability
   - Enable required AWS services in target region (eu-west-1)
   - Set up billing alerts at $20, $50, $100

2. **Development Environment**
   - Clone existing Replit codebase to local development
   - Install AWS CLI and configure credentials
   - Set up local PostgreSQL for testing

3. **Team Coordination**
   - Schedule migration window (recommend weekend)
   - Prepare rollback procedures and communication plan
   - Set up monitoring and alerting for new infrastructure

### Technical Implementation Priority
1. **Start with Authentication** (highest risk, most user-facing)
2. **File Storage Migration** (data preservation critical)
3. **Database Migration** (final cutover step)

---

## Documentation & Knowledge Transfer

This architecture document serves as the **single source of truth** for your development team. Key points:

- **Maintains all existing ScaleMap functionality** from the PRD
- **Preserves the 72-hour AI analysis pipeline** with 12 domain agents
- **Enables production scalability** beyond Replit's constraints
- **Optimizes costs** using AWS Free Tier during MVP phase
- **Provides clear migration path** with minimal code changes

**Next Action:** Your development team should begin with Phase 1 infrastructure provisioning, following the exact AWS service specifications outlined above.

---

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-09-22 | 1.0 | Initial AWS Migration Architecture | Winston (Architect) |