# AWS Testing Environment Setup

**Date:** 2025-09-22
**Purpose:** Document parallel AWS testing environment for migration validation

## Testing Environment Overview

This document outlines the parallel AWS testing environment that will be used to validate the migration from Replit to AWS before production cutover.

## AWS Account Information
- **Account ID:** 884337373956
- **User:** scalemap-service
- **Default Region:** eu-west-1
- **CLI Version:** aws-cli/2.0.30

## Testing Environment Variables Template

Create a `.env.testing` file for AWS testing:

```bash
# AWS Testing Environment Configuration
NODE_ENV=testing

# Database (RDS Testing Instance)
DATABASE_URL=postgresql://testuser:testpass@scalemap-test-rds.xxxxx.eu-west-1.rds.amazonaws.com:5432/scalemap_test

# AWS Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA_TEST_KEY_ID
AWS_SECRET_ACCESS_KEY=test_secret_key

# Cognito Testing Configuration
COGNITO_USER_POOL_ID=eu-west-1_TEST_POOL
COGNITO_CLIENT_ID=test_client_id

# S3 Testing Configuration
S3_BUCKET_NAME=scalemap-testing-storage

# Keep production values for external services
OPENAI_API_KEY=[use-production-key-for-testing]
STRIPE_SECRET_KEY=[use-test-key]
STRIPE_PUBLISHABLE_KEY=[use-test-key]

# Session configuration
SESSION_SECRET=testing-session-secret-key

# Application
PORT=3001
```

## Required AWS Resources for Testing

### 1. RDS PostgreSQL Testing Instance
```bash
# Create test RDS instance
aws rds create-db-instance \
  --db-instance-identifier scalemap-test-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username testuser \
  --master-user-password [secure-password] \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids [security-group-id] \
  --db-subnet-group-name [subnet-group] \
  --availability-zone eu-west-1a \
  --backup-retention-period 1 \
  --port 5432 \
  --no-multi-az \
  --publicly-accessible \
  --storage-encrypted
```

### 2. S3 Testing Bucket
```bash
# Create test S3 bucket
aws s3 mb s3://scalemap-testing-storage --region eu-west-1

# Configure bucket policy for testing
aws s3api put-bucket-policy \
  --bucket scalemap-testing-storage \
  --policy file://testing-bucket-policy.json
```

### 3. Cognito User Pool for Testing
```bash
# Create test user pool
aws cognito-idp create-user-pool \
  --pool-name ScaleMapTestingUserPool \
  --region eu-west-1 \
  --auto-verified-attributes email \
  --username-attributes email

# Create user pool client
aws cognito-idp create-user-pool-client \
  --user-pool-id [USER_POOL_ID] \
  --client-name ScaleMapTestingClient \
  --no-generate-secret \
  --refresh-token-validity 30 \
  --access-token-validity 60 \
  --id-token-validity 60
```

## Testing Validation Checklist

### Database Testing
- [ ] Create test RDS instance with same schema as Neon
- [ ] Test database connectivity from local environment
- [ ] Validate Drizzle ORM with standard PostgreSQL client
- [ ] Test session storage with connect-pg-simple
- [ ] Compare query performance: Neon vs RDS

### File Storage Testing
- [ ] Create test S3 bucket with appropriate policies
- [ ] Test file upload/download with S3 SDK
- [ ] Validate presigned URL generation
- [ ] Test ACL permissions mapping from GCS to S3
- [ ] Compare upload/download speeds: GCS vs S3

### Authentication Testing
- [ ] Create test Cognito User Pool
- [ ] Test user registration flow
- [ ] Test login/logout functionality
- [ ] Validate session management
- [ ] Test password reset flow
- [ ] Compare auth flow: Replit OpenID vs Cognito

### Application Integration Testing
- [ ] Test complete user workflow in AWS environment
- [ ] Validate AI analysis pipeline with AWS infrastructure
- [ ] Test Stripe integration (using test keys)
- [ ] Validate WebSocket connections
- [ ] Test all API endpoints
- [ ] Performance testing: response times and throughput

## Testing Scripts

Create `scripts/test-aws-setup.js` for automated testing:

```javascript
// Test AWS connectivity and basic operations
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');

async function testAWSSetup() {
  console.log('Testing AWS Environment Setup...');

  // Test S3 connectivity
  try {
    const s3 = new S3Client({ region: 'eu-west-1' });
    await s3.send(new PutObjectCommand({
      Bucket: 'scalemap-testing-storage',
      Key: 'test-file.txt',
      Body: 'Test file content'
    }));
    console.log('✅ S3 upload test passed');
  } catch (error) {
    console.log('❌ S3 test failed:', error.message);
  }

  // Test RDS connectivity
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    const result = await pool.query('SELECT NOW()');
    console.log('✅ RDS connectivity test passed');
    await pool.end();
  } catch (error) {
    console.log('❌ RDS test failed:', error.message);
  }
}

module.exports = { testAWSSetup };
```

## Monitoring and Logging

### CloudWatch Configuration
- Set up CloudWatch logs for application monitoring
- Configure metrics for performance tracking
- Set up alarms for error rates and latency

### Cost Monitoring
```bash
# Set up billing alerts
aws budgets create-budget \
  --account-id 884337373956 \
  --budget '{
    "BudgetName": "ScaleMapTestingBudget",
    "BudgetLimit": {
      "Amount": "50",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

## Security Configuration

### IAM Policies for Testing
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::scalemap-testing-storage/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds-db:connect"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Testing Timeline

### Week 1: Infrastructure Setup
- [ ] Day 1-2: Provision RDS, S3, Cognito testing resources
- [ ] Day 3-4: Configure security groups and IAM policies
- [ ] Day 5-7: Test basic connectivity and access

### Week 2: Application Testing
- [ ] Day 1-3: Integration testing with existing codebase
- [ ] Day 4-5: Performance and load testing
- [ ] Day 6-7: Security and access testing

### Week 3: Migration Preparation
- [ ] Day 1-2: Final validation and testing
- [ ] Day 3-5: Data migration testing
- [ ] Day 6-7: Production cutover preparation

## Rollback Procedures

### Testing Environment Cleanup
```bash
# Clean up testing resources
aws rds delete-db-instance \
  --db-instance-identifier scalemap-test-db \
  --skip-final-snapshot

aws s3 rm s3://scalemap-testing-storage --recursive
aws s3 rb s3://scalemap-testing-storage

aws cognito-idp delete-user-pool \
  --user-pool-id [USER_POOL_ID]
```

### Emergency Rollback Plan
1. Revert DNS changes to point back to Replit
2. Restore database backup to Neon
3. Reactivate GCS file storage
4. Switch back to Replit authentication

---

**Status:** Testing environment configuration documented
**Next Steps:**
1. Provision AWS testing resources using CLI commands above
2. Run connectivity tests
3. Begin application integration testing

**Created:** 2025-09-22 by James (Dev Agent)
**Last Updated:** 2025-09-22