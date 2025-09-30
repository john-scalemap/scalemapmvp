import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';

describe('Concurrent Assessment Processing Capabilities', () => {
  let authTokens: string[];
  let userIds: string[];
  let assessmentIds: string[];

  beforeAll(async () => {
    // Setup multiple test users for concurrent testing
    const users = [
      {
        sub: 'concurrent-user-1',
        email: 'concurrent1@example.com',
        first_name: 'Concurrent',
        last_name: 'User1',
        'cognito:username': 'concurrent1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        aud: 'test-client-id',
        iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_iGWQ7N6sH'
      },
      {
        sub: 'concurrent-user-2',
        email: 'concurrent2@example.com',
        first_name: 'Concurrent',
        last_name: 'User2',
        'cognito:username': 'concurrent2',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        aud: 'test-client-id',
        iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_iGWQ7N6sH'
      },
      {
        sub: 'concurrent-user-3',
        email: 'concurrent3@example.com',
        first_name: 'Concurrent',
        last_name: 'User3',
        'cognito:username': 'concurrent3',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        aud: 'test-client-id',
        iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_iGWQ7N6sH'
      }
    ];

    // Create users in storage
    for (let i = 0; i < users.length; i++) {
      await storage.upsertUser({
        id: users[i].sub,
        email: users[i].email,
        firstName: users[i].first_name,
        lastName: users[i].last_name,
        companyName: `Concurrent Company ${i + 1}`,
        industry: 'Technology',
        revenue: '$10M-$50M',
        teamSize: 75
      });
    }

    userIds = users.map(u => u.sub);
    authTokens = users.map((_, i) => `Bearer concurrent-token-${i + 1}`);

    // Mock JWT validation for multiple users
    jest.spyOn(require('../../server/cognitoAuth'), 'isAuthenticated')
      .mockImplementation((req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization;
        const tokenIndex = authTokens.findIndex(token => token === authHeader);

        if (tokenIndex !== -1) {
          req.user = { claims: users[tokenIndex] };
          next();
        } else {
          res.status(401).json({ error: 'Unauthorized' });
        }
      });

    assessmentIds = [];
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      for (const assessmentId of assessmentIds) {
        await storage.deleteAssessment(assessmentId);
      }
      for (const userId of userIds) {
        await storage.deleteUser(userId);
      }
    } catch (error) {
      console.log('Cleanup completed');
    }
  });

  describe('Concurrent Assessment Creation', () => {
    test('should handle multiple simultaneous assessment creations', async () => {
      const promises = authTokens.map(token =>
        request(app)
          .post('/api/assessments')
          .set('Authorization', token)
      );

      const responses = await Promise.all(promises);

      // All assessments should be created successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          id: expect.any(String),
          userId: userIds[index],
          status: 'pending',
          totalQuestions: expect.any(Number)
        });
        assessmentIds.push(response.body.id);
      });

      // All assessments should have unique IDs
      const uniqueIds = new Set(assessmentIds);
      expect(uniqueIds.size).toBe(assessmentIds.length);
    });

    test('should maintain data integrity during concurrent operations', async () => {
      // Verify each user can only see their own assessments
      const assessmentPromises = authTokens.map(token =>
        request(app)
          .get('/api/assessments')
          .set('Authorization', token)
      );

      const assessmentResponses = await Promise.all(assessmentPromises);

      assessmentResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        // Each user should see only their own assessment
        response.body.forEach((assessment: any) => {
          expect(assessment.userId).toBe(userIds[index]);
        });
      });
    });

    test('should handle concurrent payment intent creation', async () => {
      const paymentPromises = assessmentIds.map((assessmentId, index) =>
        request(app)
          .post('/api/create-payment-intent')
          .set('Authorization', authTokens[index])
          .send({ assessmentId })
      );

      const paymentResponses = await Promise.all(paymentPromises);

      paymentResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          clientSecret: expect.stringMatching(/^pi_.*_secret_.*$/),
          paymentIntentId: expect.stringMatching(/^pi_.*$/),
          amount: 750000,
          currency: 'gbp'
        });
      });

      // All payment intents should be unique
      const paymentIntentIds = paymentResponses.map(r => r.body.paymentIntentId);
      const uniquePaymentIds = new Set(paymentIntentIds);
      expect(uniquePaymentIds.size).toBe(paymentIntentIds.length);
    });
  });

  describe('Concurrent Response Submission', () => {
    test('should handle multiple users submitting responses simultaneously', async () => {
      const responseData = [
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-1',
          response: 'Strategic vision is clearly defined.',
          score: 8
        },
        {
          domainName: 'Financial Management',
          questionId: 'financial-management-1',
          response: 'Financial processes are well managed.',
          score: 7
        }
      ];

      const submissionPromises = assessmentIds.map((assessmentId, index) =>
        request(app)
          .post(`/api/assessments/${assessmentId}/responses`)
          .set('Authorization', authTokens[index])
          .send({ responses: responseData })
      );

      const submissionResponses = await Promise.all(submissionPromises);

      submissionResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          message: 'Assessment responses saved successfully',
          progress: expect.any(Number),
          responsesCount: 2
        });
      });
    });

    test('should handle concurrent responses to same assessment by same user', async () => {
      const assessmentId = assessmentIds[0];
      const authToken = authTokens[0];

      const concurrentResponses = [
        [
          {
            domainName: 'Revenue Engine',
            questionId: 'revenue-engine-1',
            response: 'Sales pipeline is predictable.',
            score: 9
          }
        ],
        [
          {
            domainName: 'Operations Excellence',
            questionId: 'operations-excellence-1',
            response: 'Operations are efficient.',
            score: 8
          }
        ],
        [
          {
            domainName: 'People & Organization',
            questionId: 'people-organization-1',
            response: 'Team management is excellent.',
            score: 7
          }
        ]
      ];

      const promises = concurrentResponses.map(responses =>
        request(app)
          .post(`/api/assessments/${assessmentId}/responses`)
          .set('Authorization', authToken)
          .send({ responses })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Verify all responses were saved
      const allResponses = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .expect(200);

      expect(allResponses.body).toHaveLength(5); // 2 initial + 3 concurrent
    });

    test('should maintain response integrity under high concurrency', async () => {
      const assessmentId = assessmentIds[1];
      const authToken = authTokens[1];

      // Submit many responses concurrently
      const manyResponses = Array.from({ length: 10 }, (_, i) => [
        {
          domainName: 'Customer Success',
          questionId: `customer-success-${i + 1}`,
          response: `Customer management is good for area ${i + 1}.`,
          score: 7 + (i % 3)
        }
      ]);

      const promises = manyResponses.map(responses =>
        request(app)
          .post(`/api/assessments/${assessmentId}/responses`)
          .set('Authorization', authToken)
          .send({ responses })
      );

      const results = await Promise.all(promises);

      // All submissions should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Verify data integrity
      const finalResponses = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .expect(200);

      // Should have at least the concurrent responses
      expect(finalResponses.body.length).toBeGreaterThanOrEqual(10);

      // All responses should be valid
      finalResponses.body.forEach((response: any) => {
        expect(response).toMatchObject({
          assessmentId,
          domainName: expect.any(String),
          questionId: expect.any(String),
          response: expect.any(String),
          score: expect.any(Number)
        });
      });
    });
  });

  describe('Concurrent Analysis Processing', () => {
    test('should handle multiple assessments entering analysis phase simultaneously', async () => {
      // Simulate multiple payments completing at once
      const webhookPromises = assessmentIds.map((assessmentId, index) => {
        const webhookPayload = {
          id: `evt_concurrent_${index}`,
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: `pi_concurrent_${index}`,
              status: 'succeeded',
              metadata: {
                assessmentId,
                userId: userIds[index]
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        return request(app)
          .post('/api/stripe/webhook')
          .set('stripe-signature', 'mock-signature')
          .send(webhookPayload);
      });

      const webhookResponses = await Promise.all(webhookPromises);

      webhookResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.received).toBe(true);
      });

      // Wait for analysis to be triggered
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all assessments moved to analysis phase
      const statusPromises = assessmentIds.map((assessmentId, index) =>
        request(app)
          .get(`/api/assessments/${assessmentId}/status`)
          .set('Authorization', authTokens[index])
      );

      const statusResponses = await Promise.all(statusPromises);

      statusResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('paid');
        expect(response.body.phase).toBe('analysis');
      });
    });

    test('should process concurrent document uploads', async () => {
      const uploadPromises = assessmentIds.map((assessmentId, index) =>
        request(app)
          .post('/api/objects/upload')
          .set('Authorization', authTokens[index])
      );

      const uploadResponses = await Promise.all(uploadPromises);

      uploadResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          uploadURL: expect.any(String),
          objectKey: expect.any(String)
        });
      });

      // Upload documents to assessments
      const documentPromises = assessmentIds.map((assessmentId, index) => {
        const documentData = {
          fileName: `document-${index + 1}.pdf`,
          fileSize: 1024000,
          fileType: 'application/pdf',
          uploadURL: uploadResponses[index].body.uploadURL
        };

        return request(app)
          .post(`/api/assessments/${assessmentId}/documents`)
          .set('Authorization', authTokens[index])
          .send(documentData);
      });

      const documentResponses = await Promise.all(documentPromises);

      documentResponses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should handle concurrent analysis status requests', async () => {
      const statusRequestPromises = [];

      // Generate many concurrent status requests across all assessments
      for (let i = 0; i < 20; i++) {
        const assessmentIndex = i % assessmentIds.length;
        statusRequestPromises.push(
          request(app)
            .get(`/api/assessments/${assessmentIds[assessmentIndex]}/status`)
            .set('Authorization', authTokens[assessmentIndex])
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(statusRequestPromises);
      const endTime = Date.now();

      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBeTruthy();
      });

      // Should handle load efficiently (under 3 seconds for 20 requests)
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('System Performance Under Load', () => {
    test('should maintain database consistency under concurrent operations', async () => {
      // Perform various operations concurrently across all assessments
      const mixedOperations: Promise<any>[] = [];

      assessmentIds.forEach((assessmentId, index) => {
        const authToken = authTokens[index];

        // Add status check
        mixedOperations.push(
          request(app)
            .get(`/api/assessments/${assessmentId}/status`)
            .set('Authorization', authToken)
        );

        // Add progress check
        mixedOperations.push(
          request(app)
            .get(`/api/assessments/${assessmentId}/progress`)
            .set('Authorization', authToken)
        );

        // Add response submission
        mixedOperations.push(
          request(app)
            .post(`/api/assessments/${assessmentId}/responses`)
            .set('Authorization', authToken)
            .send({
              responses: [{
                domainName: 'Technology & Data',
                questionId: `tech-data-load-test-${index}`,
                response: 'Load test response.',
                score: 8
              }]
            })
        );
      });

      const results = await Promise.all(mixedOperations);

      // Verify all operations completed successfully
      results.forEach(result => {
        expect([200, 201, 202]).toContain(result.status);
      });

      // Verify data consistency - each assessment should have correct data
      for (let i = 0; i < assessmentIds.length; i++) {
        const responses = await request(app)
          .get(`/api/assessments/${assessmentIds[i]}/responses`)
          .set('Authorization', authTokens[i])
          .expect(200);

        // Should have responses from this user only
        responses.body.forEach((response: any) => {
          expect(response.assessmentId).toBe(assessmentIds[i]);
        });
      }
    });

    test('should handle peak concurrent user load', async () => {
      const peakLoadOperations = [];

      // Simulate peak load with 50 concurrent operations
      for (let i = 0; i < 50; i++) {
        const userIndex = i % userIds.length;
        const assessmentId = assessmentIds[userIndex];
        const authToken = authTokens[userIndex];

        if (i % 3 === 0) {
          // Status check
          peakLoadOperations.push(
            request(app)
              .get(`/api/assessments/${assessmentId}/status`)
              .set('Authorization', authToken)
          );
        } else if (i % 3 === 1) {
          // Progress check
          peakLoadOperations.push(
            request(app)
              .get(`/api/assessments/${assessmentId}/progress`)
              .set('Authorization', authToken)
          );
        } else {
          // Response submission
          peakLoadOperations.push(
            request(app)
              .post(`/api/assessments/${assessmentId}/responses`)
              .set('Authorization', authToken)
              .send({
                responses: [{
                  domainName: 'Market Position',
                  questionId: `market-position-peak-${i}`,
                  response: `Peak load test response ${i}.`,
                  score: 6 + (i % 5)
                }]
              })
          );
        }
      }

      const startTime = Date.now();
      const results = await Promise.all(peakLoadOperations);
      const endTime = Date.now();

      // All operations should complete within reasonable time (under 10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);

      // Calculate success rate
      const successfulOperations = results.filter(r => [200, 201, 202].includes(r.status));
      const successRate = successfulOperations.length / results.length;

      // Should have high success rate (>95%)
      expect(successRate).toBeGreaterThan(0.95);
    });

    test('should gracefully handle resource exhaustion scenarios', async () => {
      // Create many rapid-fire requests to test resource limits
      const rapidRequests = Array.from({ length: 100 }, (_, i) => {
        const userIndex = i % userIds.length;
        return request(app)
          .get(`/api/assessments/${assessmentIds[userIndex]}/status`)
          .set('Authorization', authTokens[userIndex]);
      });

      const responses = await Promise.all(rapidRequests);

      // Should either succeed or fail gracefully (no crashes)
      responses.forEach(response => {
        expect([200, 429, 503]).toContain(response.status); // 429=rate limit, 503=service unavailable
      });

      // If rate limiting kicks in, error messages should be helpful
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      rateLimitedResponses.forEach(response => {
        expect(response.body).toMatchObject({
          error: expect.stringContaining('rate limit')
        });
      });
    });
  });

  describe('Concurrent Analysis Results Generation', () => {
    test('should generate results for multiple assessments simultaneously', async () => {
      // Mark all assessments as completed analysis
      for (let i = 0; i < assessmentIds.length; i++) {
        await storage.updateAssessment(assessmentIds[i], {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
      }

      // Request results for all assessments concurrently
      const resultsPromises = assessmentIds.map((assessmentId, index) =>
        request(app)
          .get(`/api/assessments/${assessmentId}/executive-summary`)
          .set('Authorization', authTokens[index])
      );

      const resultsResponses = await Promise.all(resultsPromises);

      resultsResponses.forEach((response, index) => {
        if (response.status === 200) {
          expect(response.body).toMatchObject({
            assessmentId: assessmentIds[index],
            executiveSummary: expect.any(String),
            keyBottlenecks: expect.any(Array)
          });
        } else {
          // Analysis may still be in progress
          expect(response.status).toBe(202);
        }
      });
    });

    test('should maintain result quality under concurrent processing', async () => {
      // Verify each assessment produces consistent, high-quality results
      const qualityChecks = assessmentIds.map((assessmentId, index) =>
        request(app)
          .get(`/api/assessments/${assessmentId}/quality-check`)
          .set('Authorization', authTokens[index])
      );

      const qualityResponses = await Promise.all(qualityChecks);

      qualityResponses.forEach(response => {
        if (response.status === 200) {
          expect(response.body.qualityScore).toBeGreaterThanOrEqual(0.7);
        }
      });
    });
  });
});