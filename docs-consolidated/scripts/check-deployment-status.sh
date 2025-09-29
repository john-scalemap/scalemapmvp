#!/bin/bash
# ScaleMap Deployment Status Check Script
# Usage: ./scripts/check-deployment-status.sh

# Configuration
export AWS_REGION="eu-west-1"
export ECS_CLUSTER_NAME="scalemap-cluster"
export ECS_SERVICE_NAME="ApiService"
export BACKEND_ENDPOINT="http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com"

echo "🔍 ScaleMap Deployment Status Check"
echo "===================================="
echo "Timestamp: $(date)"
echo ""

# Backend Status
echo "🔧 Backend Status:"
echo "=================="

# ECS Service Status
echo "ECS Service Status:"
aws ecs describe-services \
    --cluster $ECS_CLUSTER_NAME \
    --services $ECS_SERVICE_NAME \
    --region $AWS_REGION \
    --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,TaskDefinition:taskDefinition}' \
    --output table 2>/dev/null || echo "❌ Failed to get ECS status (check AWS credentials)"

# Backend Health
echo ""
echo "Backend Health Check:"
if curl -s -f "$BACKEND_ENDPOINT/health" > /dev/null; then
    echo "✅ Backend responding"
    curl -s "$BACKEND_ENDPOINT/health" | jq . 2>/dev/null || curl -s "$BACKEND_ENDPOINT/health"
else
    echo "❌ Backend not responding"
fi

# Current Backend Version
echo ""
echo "Current Backend Image:"
aws ecs describe-task-definition \
    --task-definition $(aws ecs describe-services \
        --cluster $ECS_CLUSTER_NAME \
        --services $ECS_SERVICE_NAME \
        --region $AWS_REGION \
        --query 'services[0].taskDefinition' \
        --output text 2>/dev/null) \
    --region $AWS_REGION \
    --query 'taskDefinition.containerDefinitions[0].image' \
    --output text 2>/dev/null || echo "❌ Failed to get backend version"

echo ""
echo "🎨 Frontend Status:"
echo "==================="

# Frontend Health
if curl -s -f "https://d2nr28qnjfjgb5.cloudfront.net/" > /dev/null; then
    echo "✅ Frontend responding"
else
    echo "❌ Frontend not responding"
fi

# Frontend Version
echo ""
echo "Frontend Version:"
FRONTEND_VERSION=$(curl -s "https://d2nr28qnjfjgb5.cloudfront.net/version.txt" 2>/dev/null)
if [ -n "$FRONTEND_VERSION" ]; then
    echo "$FRONTEND_VERSION"
else
    echo "⚠️ No version.txt found (missing version tracking)"
fi

# Frontend API Configuration
echo ""
echo "Frontend API Configuration:"
API_ENDPOINT=$(curl -s "https://d2nr28qnjfjgb5.cloudfront.net/assets/index-*.js" 2>/dev/null | \
    grep -o 'http://[^"]*elb\.amazonaws\.com' | head -1)

if [ -n "$API_ENDPOINT" ]; then
    echo "API Endpoint: $API_ENDPOINT"
    if [ "$API_ENDPOINT" = "$BACKEND_ENDPOINT" ]; then
        echo "✅ Frontend API endpoint matches backend"
    else
        echo "❌ Frontend API endpoint mismatch!"
        echo "   Expected: $BACKEND_ENDPOINT"
        echo "   Found: $API_ENDPOINT"
    fi
else
    echo "⚠️ No explicit API endpoint found in frontend (may be using relative URLs)"
fi

# Cognito Configuration Check
echo ""
echo "Cognito Configuration:"
COGNITO_POOL=$(curl -s "https://d2nr28qnjfjgb5.cloudfront.net/assets/index-*.js" 2>/dev/null | \
    grep -o 'eu-west-1_[a-zA-Z0-9]*' | head -1)

if [ "$COGNITO_POOL" = "eu-west-1_iGWQ7N6sH" ]; then
    echo "✅ Correct Cognito User Pool: $COGNITO_POOL"
else
    echo "❌ Incorrect or missing Cognito User Pool"
    echo "   Expected: eu-west-1_iGWQ7N6sH"
    echo "   Found: $COGNITO_POOL"
fi

echo ""
echo "🔗 Version Synchronization:"
echo "==========================="

# Get backend version
BACKEND_VERSION=$(aws ecs describe-task-definition \
    --task-definition $(aws ecs describe-services \
        --cluster $ECS_CLUSTER_NAME \
        --services $ECS_SERVICE_NAME \
        --region $AWS_REGION \
        --query 'services[0].taskDefinition' \
        --output text 2>/dev/null) \
    --region $AWS_REGION \
    --query 'taskDefinition.containerDefinitions[0].image' \
    --output text 2>/dev/null | cut -d: -f2)

FRONTEND_VERSION_SHORT=$(echo "$FRONTEND_VERSION" | head -1)

echo "Backend Version: ${BACKEND_VERSION:-Unknown}"
echo "Frontend Version: ${FRONTEND_VERSION_SHORT:-Unknown}"

if [ -n "$BACKEND_VERSION" ] && [ -n "$FRONTEND_VERSION_SHORT" ] && [ "$BACKEND_VERSION" = "$FRONTEND_VERSION_SHORT" ]; then
    echo "✅ Versions synchronized"
elif [ -z "$BACKEND_VERSION" ] || [ -z "$FRONTEND_VERSION_SHORT" ]; then
    echo "⚠️ Cannot verify synchronization (missing version info)"
else
    echo "❌ Version mismatch detected!"
fi

echo ""
echo "📊 Quick Health Summary:"
echo "========================"

# Backend status
if curl -s -f "$BACKEND_ENDPOINT/health" > /dev/null; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Unhealthy"
fi

# Frontend status
if curl -s -f "https://d2nr28qnjfjgb5.cloudfront.net/" > /dev/null; then
    echo "✅ Frontend: Responding"
else
    echo "❌ Frontend: Not responding"
fi

# Version tracking
if [ -n "$FRONTEND_VERSION" ]; then
    echo "✅ Version tracking: Active"
else
    echo "⚠️ Version tracking: Missing"
fi

echo ""
echo "🚨 Issues Found:"
echo "================"

ISSUES_FOUND=0

# Check for version tracking
if [ -z "$FRONTEND_VERSION" ]; then
    echo "- Missing frontend version tracking (no version.txt)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check for API endpoint
if [ -z "$API_ENDPOINT" ]; then
    echo "- Frontend API endpoint not explicitly configured"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check version sync
if [ -n "$BACKEND_VERSION" ] && [ -n "$FRONTEND_VERSION_SHORT" ] && [ "$BACKEND_VERSION" != "$FRONTEND_VERSION_SHORT" ]; then
    echo "- Frontend and backend versions are not synchronized"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ No issues detected"
fi

echo ""
echo "📋 Recommended Actions:"
echo "======================="

if [ -z "$FRONTEND_VERSION" ]; then
    echo "1. Deploy using docs-consolidated/scripts/deploy-production.sh to add version tracking"
fi

if [ -z "$API_ENDPOINT" ]; then
    echo "2. Ensure VITE_API_URL is set during frontend build"
fi

if [ $ISSUES_FOUND -gt 0 ]; then
    echo "3. See docs-consolidated/troubleshooting-guide.md for solutions"
else
    echo "1. System appears healthy - continue monitoring"
fi

echo ""
echo "Status check complete at $(date)"