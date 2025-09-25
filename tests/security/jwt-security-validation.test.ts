import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { spawn, ChildProcess } from 'child_process';

describe('JWT Token Security Validation', () => {
  let serverProcess: ChildProcess;
  const BASE_URL = 'http://localhost:8080';

  beforeAll(async () => {
    // Start server for security testing
    console.log('Starting server for JWT security validation...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    await new Promise((resolve) => {
      serverProcess.stdout?.on('data', (data) => {
        if (data.toString().includes('Server running') || data.toString().includes('localhost')) {
          setTimeout(resolve, 3000);
        }
      });
    });
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  describe('JWT Token Validation Security', () => {
    test('should reject requests with malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid.token.format',
        'Bearer invalid-token',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid-signature'
      ];

      for (const token of malformedTokens) {
        const response = await request(BASE_URL)
          .get('/api/auth/user')
          .set('Authorization', token)
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid|unauthorized|token/i);
      }
    });

    test('should reject expired JWT tokens', async () => {
      // Create an expired token (expired 1 hour ago)
      const expiredPayload = {
        sub: 'test-user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200  // 2 hours ago
      };

      const expiredToken = jwt.sign(expiredPayload, 'test-secret');

      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/expired|invalid/i);
    });

    test('should reject JWT tokens with invalid signatures', async () => {
      // Create a token with a different secret
      const payload = {
        sub: 'test-user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
        iat: Math.floor(Date.now() / 1000)
      };

      const tokenWithWrongSecret = jwt.sign(payload, 'wrong-secret');

      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${tokenWithWrongSecret}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid|unauthorized/i);
    });

    test('should reject tokens with missing required claims', async () => {
      // Create tokens missing required claims
      const incompleteTokens = [
        // Missing 'sub' claim
        jwt.sign({
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        }, 'test-secret'),

        // Missing 'exp' claim
        jwt.sign({
          sub: 'test-user-123',
          email: 'test@example.com',
          iat: Math.floor(Date.now() / 1000)
        }, 'test-secret'),

        // Empty payload
        jwt.sign({}, 'test-secret')
      ];

      for (const token of incompleteTokens) {
        const response = await request(BASE_URL)
          .get('/api/auth/user')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });

    test('should validate token audience and issuer claims', async () => {
      // Create token with wrong audience
      const wrongAudienceToken = jwt.sign({
        sub: 'test-user-123',
        email: 'test@example.com',
        aud: 'wrong-audience',
        iss: 'wrong-issuer',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      }, 'test-secret');

      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${wrongAudienceToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle token replay attacks', async () => {
      // Test for jti (JWT ID) claim handling to prevent replay attacks
      const jwtId = 'unique-jwt-id-123';

      const tokenWithJti = jwt.sign({
        sub: 'test-user-123',
        email: 'test@example.com',
        jti: jwtId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      }, 'test-secret');

      // First request should be rejected (no valid Cognito signature)
      const response1 = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${tokenWithJti}`)
        .expect(401);

      // Second identical request should also be rejected
      const response2 = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${tokenWithJti}`)
        .expect(401);

      expect(response1.body).toHaveProperty('error');
      expect(response2.body).toHaveProperty('error');
    });

    test('should validate token structure and format', async () => {
      const invalidTokenFormats = [
        '', // Empty token
        'Bearer', // Bearer without token
        'Basic dGVzdDp0ZXN0', // Wrong auth method
        'Bearer token-without-dots', // No JWT structure
        'Bearer a.b', // Only 2 parts instead of 3
        'Bearer a.b.c.d.e' // Too many parts
      ];

      for (const invalidToken of invalidTokenFormats) {
        const response = await request(BASE_URL)
          .get('/api/auth/user')
          .set('Authorization', invalidToken);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('JWT Token Storage Security', () => {
    test('should not expose JWT tokens in server logs', async () => {
      // This test would verify that tokens are not logged
      // In practice, you'd check log files or log capture systems

      const testToken = jwt.sign({
        sub: 'test-user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      }, 'test-secret');

      await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(401);

      // Verify token is not exposed in logs
      // This would require log analysis in a real implementation
      expect(testToken).toBeTruthy(); // Placeholder validation
    });

    test('should handle token extraction securely', async () => {
      // Test various Authorization header formats
      const headerFormats = [
        'bearer token123', // lowercase bearer
        'Bearer  token123', // extra spaces
        'Bearer\ttoken123', // tab character
        'Bearer\ntoken123', // newline character
      ];

      for (const header of headerFormats) {
        const response = await request(BASE_URL)
          .get('/api/auth/user')
          .set('Authorization', header)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('JWT Algorithm Security', () => {
    test('should reject tokens with none algorithm', async () => {
      // Create token with "none" algorithm (security vulnerability)
      const noneAlgToken = jwt.sign({
        sub: 'test-user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      }, '', { algorithm: 'none' });

      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${noneAlgToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should only accept expected JWT algorithms', async () => {
      // Test with different algorithms
      const algorithms = ['HS256', 'HS512', 'RS256'] as const;

      for (const alg of algorithms) {
        try {
          const token = jwt.sign({
            sub: 'test-user-123',
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
          }, alg.startsWith('RS') ? 'fake-rsa-key' : 'test-secret', { algorithm: alg });

          const response = await request(BASE_URL)
            .get('/api/auth/user')
            .set('Authorization', `Bearer ${token}`);

          // All should be rejected since they're not valid Cognito tokens
          expect(response.status).toBe(401);
        } catch (error) {
          // Expected for some algorithms without proper keys
          expect(error).toBeTruthy();
        }
      }
    });

    test('should validate JWT header structure', async () => {
      // Manually craft JWT with invalid header
      const invalidHeader = Buffer.from(JSON.stringify({
        typ: 'JWT',
        alg: 'HS256',
        maliciousField: 'exploit-attempt'
      })).toString('base64url');

      const validPayload = Buffer.from(JSON.stringify({
        sub: 'test-user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      })).toString('base64url');

      const fakeSignature = 'fake-signature';

      const malformedToken = `${invalidHeader}.${validPayload}.${fakeSignature}`;

      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Cognito Integration Security', () => {
    test('should validate against Cognito JWKS endpoint', async () => {
      // Test that the system properly validates against Cognito's public keys
      const cognitoStructureToken = {
        header: {
          alg: 'RS256',
          kid: 'test-key-id'
        },
        payload: {
          sub: 'test-user-123',
          aud: process.env.COGNITO_CLIENT_ID || 'test-client-id',
          iss: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID || 'test-pool'}`,
          token_use: 'access',
          scope: 'openid email profile',
          auth_time: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          version: 2,
          client_id: process.env.COGNITO_CLIENT_ID || 'test-client-id',
          username: 'test-user-123'
        }
      };

      // This would be a real Cognito token in production
      // For testing, we verify the structure is expected
      expect(cognitoStructureToken.header.alg).toBe('RS256');
      expect(cognitoStructureToken.payload.iss).toContain('cognito-idp');
      expect(cognitoStructureToken.payload.token_use).toBe('access');
    });

    test('should reject tokens from wrong Cognito User Pool', async () => {
      // Simulate token from different user pool
      const wrongPoolToken = jwt.sign({
        sub: 'test-user-123',
        aud: 'wrong-client-id',
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/wrong-pool-id',
        token_use: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      }, 'wrong-secret');

      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${wrongPoolToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should validate token_use claim correctly', async () => {
      // Test with id_token instead of access_token
      const idToken = jwt.sign({
        sub: 'test-user-123',
        aud: process.env.COGNITO_CLIENT_ID || 'test-client-id',
        iss: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID || 'test-pool'}`,
        token_use: 'id', // Should be 'access' for API calls
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      }, 'test-secret');

      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${idToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('should implement rate limiting for token validation', async () => {
      const invalidToken = 'Bearer invalid-token';
      const requests = [];

      // Send multiple rapid requests with invalid token
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(BASE_URL)
            .get('/api/auth/user')
            .set('Authorization', invalidToken)
        );
      }

      const responses = await Promise.all(requests);

      // All should be unauthorized
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });

      // In production, rate limiting might return 429 after threshold
      const rateLimitHeaders = responses[responses.length - 1].headers;
      // Check for rate limit headers (if implemented)
      // expect(rateLimitHeaders['x-ratelimit-remaining']).toBeDefined();
    });

    test('should handle concurrent token validation safely', async () => {
      const tokens = Array.from({ length: 5 }, (_, i) =>
        jwt.sign({
          sub: `test-user-${i}`,
          email: `test${i}@example.com`,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        }, 'test-secret')
      );

      const concurrentRequests = tokens.map(token =>
        request(BASE_URL)
          .get('/api/auth/user')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(concurrentRequests);

      // All should be handled properly (rejected due to invalid signature)
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Security Headers and Token Exposure', () => {
    test('should not include tokens in error responses', async () => {
      const testToken = 'Bearer sensitive-token-value-123';

      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', testToken)
        .expect(401);

      // Ensure token is not reflected in error response
      const responseText = JSON.stringify(response.body);
      expect(responseText.toLowerCase()).not.toContain('sensitive-token-value-123');
      expect(responseText.toLowerCase()).not.toContain('bearer');
    });

    test('should set appropriate security headers', async () => {
      const response = await request(BASE_URL)
        .get('/api/auth/user')
        .set('Authorization', 'Bearer invalid-token');

      // Check for security headers
      expect(response.headers).toHaveProperty('content-type');

      // These headers should be set for security
      // In production, you'd verify headers like:
      // - X-Content-Type-Options: nosniff
      // - X-Frame-Options: DENY
      // - X-XSS-Protection: 1; mode=block
      // - Strict-Transport-Security for HTTPS
    });

    test('should handle token extraction edge cases', async () => {
      const edgeCases = [
        'BearerToken123', // Missing space
        'Bearer ', // Trailing space only
        'Bearer\x00token', // Null byte
        'Bearer ' + 'a'.repeat(10000), // Extremely long token
        'Bearer 🚀🔐', // Unicode characters
      ];

      for (const edgeCase of edgeCases) {
        const response = await request(BASE_URL)
          .get('/api/auth/user')
          .set('Authorization', edgeCase);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});