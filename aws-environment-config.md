# AWS Infrastructure Environment Configuration

## Infrastructure Status: PROVISIONED ✅

**Provisioning Date:** 2025-09-22
**Account:** 884337373956
**Region:** eu-west-1

---

## 🗄️ Database Configuration

### RDS PostgreSQL Instance
- **Instance ID:** `scalemap-postgres`
- **Endpoint:** `scalemap-postgres.c9cy8uecim5u.eu-west-1.rds.amazonaws.com`
- **Port:** `5432`
- **Instance Class:** `db.t3.micro` (Free Tier)
- **Storage:** `20GB` (Free Tier)
- **Engine:** `PostgreSQL 16.10`
- **Database:** `scalemap`
- **Username:** `scalemap`
- **Password:** `ScaleMap2025!` (⚠️ Change in production)
- **Status:** Configuring Enhanced Monitoring

### Database URL
```bash
DATABASE_URL=postgresql://scalemap:ScaleMap2025!@scalemap-postgres.c9cy8uecim5u.eu-west-1.rds.amazonaws.com:5432/scalemap
```

---

## 📦 Object Storage Configuration

### S3 Bucket
- **Bucket Name:** `scalemap-storage`
- **Region:** `eu-west-1`
- **Access:** Private (BlockPublicAcls enabled)
- **CORS:** Configured for file uploads
- **Free Tier:** 5GB storage + 20K GET/2K PUT requests

### S3 Environment Variables
```bash
S3_BUCKET_NAME=scalemap-storage
AWS_REGION=eu-west-1
```

---

## 🔐 Authentication Configuration

### Cognito User Pool
- **Pool Name:** `ScaleMapUserPool`
- **Pool ID:** `eu-west-1_iGWQ7N6sH`
- **Client ID:** `6e7ct8tmbmhgvva2ngdn5hi6v1`
- **Client Secret:** `1ha1j74lsj0533ump6gj29ibl371mee814p5shfa0d1feu52ouj5`
- **Auto-Verification:** Email
- **Username Attributes:** Email
- **Free Tier:** 50,000 MAUs (permanently free)

### Cognito Environment Variables
```bash
COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
COGNITO_CLIENT_ID=6e7ct8tmbmhgvva2ngdn5hi6v1
COGNITO_CLIENT_SECRET=1ha1j74lsj0533ump6gj29ibl371mee814p5shfa0d1feu52ouj5
```

---

## 🚀 Application Hosting Configuration

### Elastic Beanstalk
- **Application:** `ScaleMapApp`
- **Environment:** `scalemap-prod`
- **Environment ID:** `e-jbnwh9sbe6`
- **Platform:** `Node.js 20 running on 64bit Amazon Linux 2023`
- **Instance Type:** `t3.micro` (Free Tier)
- **Environment Type:** `SingleInstance`
- **Status:** Launching

---

## 🌐 Network Configuration

### VPC Details
- **VPC ID:** `vpc-0da5d43dd5f45b6cf`
- **CIDR Block:** `172.31.0.0/16`
- **Type:** Default VPC

### Subnets
- **eu-west-1a:** `subnet-0cd43dac5487c8b75` (172.31.16.0/20)
- **eu-west-1b:** `subnet-0d92c35ef9d409ba2` (172.31.32.0/20)
- **eu-west-1c:** `subnet-0e677e8b0b34bafb7` (172.31.0.0/20)

### Security Groups
- **RDS Access:** `sg-026c3c8772c900d50`
  - Allows PostgreSQL (5432) from application security group
- **Application Access:** `sg-0365a5b4597e6c563`
  - Allows HTTP (80) from anywhere
  - Allows HTTPS (443) from anywhere

---

## 🔑 IAM Configuration

### Application Service Role
- **Role Name:** `ScaleMapApplicationRole`
- **Role ARN:** `arn:aws:iam::884337373956:role/ScaleMapApplicationRole`
- **Instance Profile:** `ScaleMapApplicationInstanceProfile`

### Application Policy Permissions
- **S3 Access:** scalemap-storage bucket (Get, Put, Delete, List)
- **Cognito Access:** User management in ScaleMapUserPool
- **CloudWatch Logs:** Log creation and streaming

---

## 💰 Cost Monitoring

### Billing Alerts (CloudWatch)
- **$20 Alert:** `ScaleMap-BillingAlert-20USD`
- **$50 Alert:** `ScaleMap-BillingAlert-50USD`
- **$100 Alert:** `ScaleMap-BillingAlert-100USD`

### Free Tier Usage
- **RDS:** 750 hrs/month db.t3.micro + 20GB storage
- **S3:** 5GB storage + 20K GET/2K PUT requests
- **Cognito:** 50,000 MAUs (permanently free)
- **Elastic Beanstalk:** 750 hrs/month t3.micro
- **Estimated Monthly Cost:** $15-30 within Free Tier limits

---

## 🔧 Complete Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://scalemap:ScaleMap2025!@scalemap-postgres.c9cy8uecim5u.eu-west-1.rds.amazonaws.com:5432/scalemap

# AWS Service Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# S3 Configuration
S3_BUCKET_NAME=scalemap-storage

# Cognito Configuration
COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
COGNITO_CLIENT_ID=6e7ct8tmbmhgvva2ngdn5hi6v1
COGNITO_CLIENT_SECRET=1ha1j74lsj0533ump6gj29ibl371mee814p5shfa0d1feu52ouj5

# Application Configuration
NODE_ENV=production
PORT=8080
```

---

## 🧪 Infrastructure Validation

### Connectivity Tests
- ✅ **RDS:** Endpoint accessible, PostgreSQL 16.10 ready
- ✅ **S3:** Bucket created, CORS configured, upload/download tested
- ✅ **Cognito:** User pool active, user creation/deletion tested
- 🔄 **Elastic Beanstalk:** Environment launching with proper IAM role
- ✅ **Security Groups:** Configured for secure inter-service communication

### Free Tier Compliance
- ✅ **All services:** Selected with Free Tier specifications
- ✅ **Billing Alerts:** Configured at $20, $50, $100 thresholds
- ✅ **Cost Monitoring:** CloudWatch billing alarms active

---

## 📋 Next Steps

### For Story 6.4 (Authentication Migration)
- Cognito User Pool ready: `eu-west-1_iGWQ7N6sH`
- Client credentials available for integration

### For Story 6.5 (Object Storage Migration)
- S3 bucket ready: `scalemap-storage`
- CORS configured for file uploads
- IAM policies set for application access

### For Story 6.6 (Database Migration)
- RDS PostgreSQL ready: `scalemap-postgres.c9cy8uecim5u.eu-west-1.rds.amazonaws.com`
- Database `scalemap` created and accessible
- Security groups configured for Elastic Beanstalk access

---

## 🔐 Security Notes

- **Database:** Change default password after initial connection
- **Cognito:** Client secret should be stored securely
- **IAM:** Roles follow least-privilege access principles
- **Network:** Security groups restrict access to required services only
- **S3:** Public access blocked, CORS configured for application domain

---

## 📞 Resource Identifiers Summary

| Service | Resource | Identifier |
|---------|----------|------------|
| RDS | PostgreSQL Instance | `scalemap-postgres` |
| S3 | Storage Bucket | `scalemap-storage` |
| Cognito | User Pool | `eu-west-1_iGWQ7N6sH` |
| Cognito | User Pool Client | `6e7ct8tmbmhgvva2ngdn5hi6v1` |
| Elastic Beanstalk | Application | `ScaleMapApp` |
| Elastic Beanstalk | Environment | `scalemap-prod` |
| IAM | Application Role | `ScaleMapApplicationRole` |
| Security Group | RDS Access | `sg-026c3c8772c900d50` |
| Security Group | App Access | `sg-0365a5b4597e6c563` |