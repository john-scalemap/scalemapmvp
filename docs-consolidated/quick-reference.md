# ScaleMap Quick Reference

**Last Updated:** 2025-09-29
**Purpose:** Instant access to common commands and procedures

## 🚀 **Emergency Commands**

### **Quick Health Check**
```bash
# Backend
curl -s http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/health | jq .

# Frontend
curl -I https://d2nr28qnjfjgb5.cloudfront.net/

# Full status
./docs-consolidated/scripts/check-deployment-status.sh
```

### **Emergency Rollback**
```bash
# List available versions
aws ecr describe-images --repository-name scalemap-api --region eu-west-1 --query 'imageDetails[*].imageTags[0]' --output table

# Rollback to specific version
./docs-consolidated/scripts/rollback-deployment.sh v20250928-143022
```

### **Cache Issues - Emergency Clear**
```bash
# Full CloudFront invalidation
aws cloudfront create-invalidation \
  --distribution-id E1OGYBMF9QDMX9 \
  --paths "/*" \
  --region eu-west-1
```

---

## 🔧 **Common Operations**

### **Deploy to Production**
```bash
# Full synchronized deployment
./docs-consolidated/scripts/deploy-production.sh

# Check deployment status
./docs-consolidated/scripts/check-deployment-status.sh
```

### **Check Current Versions**
```bash
# Backend version
aws ecs describe-task-definition \
  --task-definition $(aws ecs describe-services --cluster scalemap-cluster --services ApiService --region eu-west-1 --query 'services[0].taskDefinition' --output text) \
  --region eu-west-1 \
  --query 'taskDefinition.containerDefinitions[0].image'

# Frontend version
curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt
```

### **ECS Service Management**
```bash
# Service status
aws ecs describe-services --cluster scalemap-cluster --services ApiService --region eu-west-1

# Force new deployment
aws ecs update-service --cluster scalemap-cluster --service ApiService --force-new-deployment --region eu-west-1

# View logs
aws logs tail /ecs/scalemap-api --follow --region eu-west-1
```

---

## 🚨 **Troubleshooting**

### **Authentication Issues**
```bash
# Fix Cognito secret hash error
aws cognito-idp update-user-pool-client \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --generate-secret false \
  --region eu-west-1
```

### **Frontend/Backend Sync Issues**
```bash
# Check what API endpoint frontend is using
curl -s https://d2nr28qnjfjgb5.cloudfront.net/assets/index-*.js | grep -o 'http://[^"]*elb\.amazonaws\.com'

# Should return: http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com
```

### **Build Issues**
```bash
# Clear Docker cache
docker system prune -a -f

# Build with no cache
docker build --no-cache -t scalemap-api:test -f server/Dockerfile .

# Test build locally
docker run --rm -p 5000:5000 -e NODE_ENV=production scalemap-api:test
```

---

## 📋 **Environment Variables**

### **Production Frontend (Build-time)**
```bash
export VITE_API_URL="http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com"
export VITE_COGNITO_USER_POOL_ID="eu-west-1_iGWQ7N6sH"
export VITE_COGNITO_CLIENT_ID="6e7ct8tmbmhgvva2ngdn5hi6v1"
export VITE_AWS_REGION="eu-west-1"
export VITE_STRIPE_PUBLIC_KEY="pk_test_51S9UtWPMQGIPehV3Y1s3L9UT9UoF5IP6vNcE3a93cS2Quzf6WiiDywwVVc3vGAOfYuC3FqxduxwX0hV7uRXsqM4H00KDbCClOA"
```

### **AWS Resources**
```bash
export AWS_REGION="eu-west-1"
export ECS_CLUSTER_NAME="scalemap-cluster"
export ECS_SERVICE_NAME="ApiService"
export ECR_URI="884337373956.dkr.ecr.eu-west-1.amazonaws.com/scalemap-api"
export S3_BUCKET="scalemap-frontend-prod-884337373956"
export CLOUDFRONT_DISTRIBUTION_ID="E1OGYBMF9QDMX9"
```

---

## 🔍 **Diagnostic Commands**

### **System Status**
```bash
# Full system check
./docs-consolidated/scripts/check-deployment-status.sh

# ECS tasks
aws ecs list-tasks --cluster scalemap-cluster --service-name ApiService --region eu-west-1

# CloudWatch logs (last 10 minutes)
aws logs tail /ecs/scalemap-api --since 10m --region eu-west-1
```

### **Network & Connectivity**
```bash
# Test backend connectivity
curl -v http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/health

# Test database connectivity (requires DATABASE_URL)
psql "$DATABASE_URL" -c "SELECT 1;"

# Check security groups
aws ec2 describe-security-groups --filters "Name=group-name,Values=*scalemap*" --region eu-west-1
```

---

## 📚 **Documentation Quick Links**

- **Primary Guide:** [docs-consolidated/README.md](./README.md)
- **Deployment:** [docs-consolidated/deployment-guide.md](./deployment-guide.md)
- **Troubleshooting:** [docs-consolidated/troubleshooting-guide.md](./troubleshooting-guide.md)
- **Environment Config:** [docs-consolidated/environment-config.md](./environment-config.md)
- **Cognito Setup:** [docs-consolidated/cognito-config-reference.md](./cognito-config-reference.md)
- **Current State:** [docs-consolidated/current-state.md](./current-state.md)

---

## ⚡ **One-Liners**

```bash
# Current backend health
curl -s http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/health | jq .status

# Current frontend version
curl -s https://d2nr28qnjfjgb5.cloudfront.net/version.txt | head -1

# ECS service running count
aws ecs describe-services --cluster scalemap-cluster --services ApiService --region eu-west-1 --query 'services[0].runningCount'

# Latest backend image
aws ecs describe-task-definition --task-definition $(aws ecs describe-services --cluster scalemap-cluster --services ApiService --region eu-west-1 --query 'services[0].taskDefinition' --output text) --region eu-west-1 --query 'taskDefinition.containerDefinitions[0].image' --output text

# Test authentication flow
curl -X POST http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com/api/auth/test

# CloudFront cache status
aws cloudfront get-distribution --id E1OGYBMF9QDMX9 --query 'Distribution.Status'

# Database connection test
timeout 5 bash -c '</dev/tcp/[RDS_ENDPOINT]/5432' && echo "Database reachable" || echo "Database unreachable"
```

---

**🔧 Tip:** Bookmark this page and use it as your first stop for any ScaleMap operations!