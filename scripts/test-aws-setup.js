#!/usr/bin/env node

/**
 * AWS Testing Environment Setup Validation
 * Tests connectivity and basic operations for S3, RDS, and Cognito
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const DATABASE_URL = process.env.DATABASE_URL;

async function testS3Connectivity() {
  console.log('🔍 Testing S3 connectivity...');

  try {
    const s3Client = new S3Client({ region: AWS_REGION });

    // Test list buckets
    const listResponse = await s3Client.send(new ListBucketsCommand({}));
    console.log(`✅ S3 connection successful. Found ${listResponse.Buckets?.length || 0} buckets`);

    if (S3_BUCKET_NAME) {
      // Test upload
      const testKey = `test-uploads/test-${Date.now()}.txt`;
      const testContent = `Test file created at ${new Date().toISOString()}`;

      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
        ServerSideEncryption: 'AES256', // Ensure encryption
        ACL: 'private' // Ensure private access
      }));
      console.log(`✅ S3 upload test passed: ${testKey}`);

      // Test download
      const getResponse = await s3Client.send(new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: testKey
      }));
      console.log('✅ S3 download test passed');

      return true;
    } else {
      console.log('⚠️  S3_BUCKET_NAME not configured, skipping bucket operations');
      return false;
    }
  } catch (error) {
    console.log('❌ S3 test failed:', error.message);
    return false;
  }
}

async function testRDSConnectivity() {
  console.log('🔍 Testing RDS connectivity...');

  if (!DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not configured, skipping RDS test');
    return false;
  }

  try {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    // Security validation: Check for SSL in production
    if (process.env.NODE_ENV === 'production' && !DATABASE_URL.includes('ssl')) {
      console.log('⚠️  WARNING: SSL not enforced in database connection for production');
    }

    // Test basic query
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ RDS connectivity test passed');
    console.log(`   Database time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]}`);

    // Test table creation (optional)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_connection (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT NOW(),
          test_data TEXT
        )
      `);

      await pool.query(
        'INSERT INTO test_connection (test_data) VALUES ($1)',
        [`Test entry from ${new Date().toISOString()}`]
      );

      const countResult = await pool.query('SELECT COUNT(*) FROM test_connection');
      console.log(`✅ RDS write test passed. Test table has ${countResult.rows[0].count} entries`);
    } catch (tableError) {
      console.log('⚠️  RDS table creation test skipped:', tableError.message);
    }

    await pool.end();
    return true;
  } catch (error) {
    console.log('❌ RDS test failed:', error.message);
    return false;
  }
}

async function testAWSCredentials() {
  console.log('🔍 Testing AWS credentials...');

  try {
    const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
    const stsClient = new STSClient({ region: AWS_REGION });

    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    console.log('✅ AWS credentials valid');
    console.log(`   Account: ${identity.Account}`);
    console.log(`   User ARN: ${identity.Arn}`);

    // Security validation: Check for proper IAM user (not root)
    if (identity.Arn && identity.Arn.includes(':root')) {
      console.log('⚠️  WARNING: Using root account credentials - use IAM user instead');
    }

    // Validate region configuration
    if (AWS_REGION !== 'eu-west-1') {
      console.log(`⚠️  WARNING: Region is ${AWS_REGION}, expected eu-west-1 per architecture`);
    }

    return true;
  } catch (error) {
    console.log('❌ AWS credentials test failed:', error.message);
    return false;
  }
}

async function testCognitoSetup() {
  console.log('🔍 Testing Cognito configuration...');

  const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
  const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

  if (!COGNITO_USER_POOL_ID || !COGNITO_CLIENT_ID) {
    console.log('⚠️  Cognito not configured, skipping test');
    return false;
  }

  try {
    const { CognitoIdentityProviderClient, DescribeUserPoolCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

    const userPoolResponse = await cognitoClient.send(new DescribeUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID
    }));

    console.log('✅ Cognito User Pool accessible');
    console.log(`   Pool Name: ${userPoolResponse.UserPool?.Name}`);
    console.log(`   Pool Status: ${userPoolResponse.UserPool?.Status}`);
    return true;
  } catch (error) {
    console.log('❌ Cognito test failed:', error.message);
    return false;
  }
}

async function testSecurityConfiguration() {
  console.log('🔍 Testing security configuration...');

  const securityChecks = {
    envVarsSecure: true,
    credentialsNotHardcoded: true,
    sslConfigured: true
  };

  // Check for hardcoded credentials
  const envVars = Object.keys(process.env);
  envVars.forEach(key => {
    if (key.includes('AWS') && process.env[key]) {
      const value = process.env[key];
      if (value.match(/^[A-Z0-9]{20}$/) || value.match(/^[A-Za-z0-9/+=]{40}$/)) {
        console.log(`⚠️  WARNING: ${key} appears to be a hardcoded credential`);
        securityChecks.credentialsNotHardcoded = false;
      }
    }
  });

  // Check SSL configuration
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('ssl')) {
    console.log('⚠️  WARNING: Database URL does not enforce SSL');
    securityChecks.sslConfigured = false;
  }

  // Check environment variable security
  const requiredVars = ['AWS_REGION', 'DATABASE_URL'];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      console.log(`⚠️  WARNING: Required environment variable ${varName} not set`);
      securityChecks.envVarsSecure = false;
    }
  });

  const allChecksPass = Object.values(securityChecks).every(check => check);
  console.log(`${allChecksPass ? '✅' : '❌'} Security configuration ${allChecksPass ? 'passed' : 'has warnings'}`);

  return allChecksPass;
}

async function runAllTests() {
  console.log('🚀 Starting AWS Testing Environment Validation');
  console.log('=' .repeat(50));

  const results = {
    security: await testSecurityConfiguration(),
    credentials: await testAWSCredentials(),
    s3: await testS3Connectivity(),
    rds: await testRDSConnectivity(),
    cognito: await testCognitoSetup()
  };

  console.log('\n📊 Test Results Summary');
  console.log('=' .repeat(50));
  console.log(`Security Config: ${results.security ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AWS Credentials: ${results.credentials ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`S3 Storage:      ${results.s3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`RDS Database:    ${results.rds ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Cognito Auth:    ${results.cognito ? '✅ PASS' : '❌ FAIL'}`);

  const passCount = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);

  if (passCount === totalTests) {
    console.log('🎉 All tests passed! AWS environment is ready for migration testing.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review AWS configuration.');
    process.exit(1);
  }
}

// Run tests if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export {
  testSecurityConfiguration,
  testS3Connectivity,
  testRDSConnectivity,
  testAWSCredentials,
  testCognitoSetup,
  runAllTests
};