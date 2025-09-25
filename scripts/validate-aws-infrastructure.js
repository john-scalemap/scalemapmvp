#!/usr/bin/env node

/**
 * AWS Infrastructure Validation Script
 * Validates all provisioned AWS resources for Story 6.3
 */

import { execSync } from 'child_process';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function runCommand(command, description) {
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ ${description}`, GREEN);
    return { success: true, result };
  } catch (error) {
    log(`❌ ${description}: ${error.message}`, RED);
    return { success: false, error: error.message };
  }
}

async function validateInfrastructure() {
  log('\n🔍 AWS Infrastructure Validation - Story 6.3\n', YELLOW);

  const validations = [
    {
      command: 'aws rds describe-db-instances --db-instance-identifier scalemap-postgres --region eu-west-1 --query "DBInstances[0].DBInstanceStatus" --output text',
      description: 'RDS PostgreSQL Instance Status',
      expected: (result) => ['available', 'backing-up'].includes(result.trim())
    },
    {
      command: 'aws s3 ls s3://scalemap-storage/',
      description: 'S3 Bucket Access',
      expected: (result) => true // Any successful response means bucket is accessible
    },
    {
      command: 'aws cognito-idp describe-user-pool --user-pool-id eu-west-1_iGWQ7N6sH --region eu-west-1 --query "UserPool.Name" --output text',
      description: 'Cognito User Pool Access',
      expected: (result) => result.trim() === 'ScaleMapUserPool'
    },
    {
      command: 'aws elasticbeanstalk describe-environments --environment-names scalemap-prod --region eu-west-1 --query "Environments[0].Status" --output text',
      description: 'Elastic Beanstalk Environment Status',
      expected: (result) => ['Ready', 'Updating'].includes(result.trim())
    },
    {
      command: 'aws iam get-role --role-name ScaleMapApplicationRole --query "Role.RoleName" --output text',
      description: 'IAM Application Role',
      expected: (result) => result.trim() === 'ScaleMapApplicationRole'
    },
    {
      command: 'aws ec2 describe-security-groups --group-ids sg-026c3c8772c900d50 sg-0365a5b4597e6c563 --region eu-west-1 --query "length(SecurityGroups)"',
      description: 'Security Groups Configuration',
      expected: (result) => parseInt(result.trim()) === 2
    },
    {
      command: 'aws cloudwatch describe-alarms --alarm-names "ScaleMap-BillingAlert-20USD" --region us-east-1 --query "MetricAlarms[0].AlarmName" --output text',
      description: 'Billing Alerts Configuration',
      expected: (result) => result.trim() === 'ScaleMap-BillingAlert-20USD'
    }
  ];

  let passedCount = 0;
  let totalCount = validations.length;

  for (const validation of validations) {
    const result = runCommand(validation.command, validation.description);

    if (result.success && validation.expected(result.result)) {
      passedCount++;
    } else if (result.success) {
      log(`⚠️  ${validation.description}: Unexpected result`, YELLOW);
    }
  }

  log(`\n📊 Validation Summary: ${passedCount}/${totalCount} checks passed\n`, YELLOW);

  if (passedCount === totalCount) {
    log('🎉 All AWS infrastructure components are operational!', GREEN);
    log('✅ Ready for Story 6.4 (Authentication Migration)', GREEN);
    return true;
  } else {
    log('⚠️  Some infrastructure components need attention', YELLOW);
    return false;
  }
}

// Run validation
validateInfrastructure()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`💥 Validation script error: ${error.message}`, RED);
    process.exit(1);
  });