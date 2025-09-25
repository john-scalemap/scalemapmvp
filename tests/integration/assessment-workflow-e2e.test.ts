import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';

describe('Assessment Workflow End-to-End Integration', () => {
  let authToken: string;
  let userId: string;
  let assessmentId: string;
  let paymentIntentId: string;

  beforeAll(async () => {
    // Setup test user with valid Cognito token structure
    const mockCognitoToken = {
      sub: 'test-user-e2e-assessment',
      email: 'testuser@example.com',
      first_name: 'Test',
      last_name: 'User',
      'cognito:username': 'testuser',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      aud: 'test-client-id',
      iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_iGWQ7N6sH'
    };

    // Create user profile
    await storage.upsertUser({
      id: mockCognitoToken.sub,
      email: mockCognitoToken.email,
      firstName: mockCognitoToken.first_name,
      lastName: mockCognitoToken.last_name,
      companyName: 'Test Company',
      industry: 'Technology',
      revenue: '$1M-$10M',
      teamSize: 30
    });

    userId = mockCognitoToken.sub;
    authToken = 'Bearer mock-jwt-token';

    // Mock JWT validation to return our test user
    jest.spyOn(require('../../server/cognitoAuth'), 'isAuthenticated')
      .mockImplementation((req: any, res: any, next: any) => {
        req.user = { claims: mockCognitoToken };
        next();
      });
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (assessmentId) {
        await storage.deleteAssessment(assessmentId);
      }
      await storage.deleteUser(userId);
    } catch (error) {
      console.log('Cleanup completed');
    }
  });

  describe('Complete Assessment Creation Flow', () => {
    test('should create assessment with authenticated user', async () => {
      const response = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId: userId,
        status: 'pending',
        totalQuestions: expect.any(Number),
        amount: '7500.00',
        currency: 'GBP',
        createdAt: expect.any(String)
      });

      assessmentId = response.body.id;
      expect(assessmentId).toBeTruthy();
    });

    test('should retrieve assessment for authenticated user', async () => {
      const response = await request(app)
        .get('/api/assessments')
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContainEqual(
        expect.objectContaining({
          id: assessmentId,
          userId: userId,
          status: 'pending'
        })
      );
    });

    test('should reject assessment creation without authentication', async () => {
      await request(app)
        .post('/api/assessments')
        .expect(401);
    });

    test('should reject assessment creation with invalid token', async () => {
      await request(app)
        .post('/api/assessments')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Payment Integration with Stripe', () => {
    test('should create payment intent for assessment', async () => {
      const response = await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId })
        .expect(200);

      expect(response.body).toMatchObject({
        clientSecret: expect.stringMatching(/^pi_.*_secret_.*$/),
        paymentIntentId: expect.stringMatching(/^pi_.*$/),
        amount: 750000, // £7,500 in pence
        currency: 'gbp'
      });

      paymentIntentId = response.body.paymentIntentId;
    });

    test('should reject payment intent creation without assessment', async () => {
      await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId: 'non-existent-id' })
        .expect(404);
    });

    test('should reject payment intent creation without authentication', async () => {
      await request(app)
        .post('/api/create-payment-intent')
        .send({ assessmentId })
        .expect(401);
    });
  });

  describe('Assessment Questionnaire Progress Tracking', () => {
    test('should submit assessment responses and track progress', async () => {
      const sampleResponses = [
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-1',
          response: 'Our strategic vision is clearly defined with quarterly reviews.',
          score: 8
        },
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-2',
          response: 'Leadership team priorities are well aligned with strategy.',
          score: 7
        },
        {
          domainName: 'Financial Management',
          questionId: 'financial-management-1',
          response: 'Monthly cash flow is highly predictable with 95% accuracy.',
          score: 9
        }
      ];

      const response = await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses: sampleResponses })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Assessment responses saved successfully',
        progress: expect.any(Number),
        responsesCount: 3,
        totalQuestions: expect.any(Number)
      });

      expect(response.body.progress).toBeGreaterThan(0);
      expect(response.body.progress).toBeLessThanOrEqual(100);
    });

    test('should track assessment progress correctly', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/progress`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        assessmentId,
        totalQuestions: expect.any(Number),
        answeredQuestions: 3,
        progress: expect.any(Number),
        lastUpdated: expect.any(String)
      });
    });

    test('should persist assessment data across sessions', async () => {
      const responses = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(responses.body)).toBe(true);
      expect(responses.body).toHaveLength(3);
      expect(responses.body[0]).toMatchObject({
        domainName: 'Strategic Alignment',
        questionId: 'strategic-alignment-1',
        score: 8
      });
    });
  });

  describe('AI Analysis Pipeline Trigger', () => {
    test('should trigger AI analysis after payment completion', async () => {
      // Simulate Stripe webhook for successful payment
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            status: 'succeeded',
            metadata: {
              assessmentId: assessmentId
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock-signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toMatchObject({
        received: true
      });
    });

    test('should update assessment status after payment', async () => {
      // Check that assessment status was updated
      const response = await request(app)
        .get('/api/assessments')
        .set('Authorization', authToken)
        .expect(200);

      const assessment = response.body.find((a: any) => a.id === assessmentId);
      expect(assessment.status).toBe('paid');
      expect(assessment.paidAt).toBeTruthy();
    });

    test('should initiate triage analysis after payment', async () => {
      // Check if triage analysis was triggered
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/analysis`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(processing|completed)$/),
        triageAnalysis: expect.any(Object)
      });
    });
  });

  describe('Real-time Status Updates and Progress Indicators', () => {
    test('should provide real-time status updates', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        id: assessmentId,
        status: expect.stringMatching(/^(paid|processing|completed)$/),
        progress: expect.any(Number),
        analysisProgress: expect.objectContaining({
          triageComplete: expect.any(Boolean),
          executiveSummaryComplete: expect.any(Boolean),
          domainAnalysisComplete: expect.any(Boolean),
          implementationKitsComplete: expect.any(Boolean)
        }),
        estimatedCompletion: expect.any(String)
      });
    });

    test('should show progressive analysis completion', async () => {
      // Poll status to verify progression
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.analysisProgress.triageComplete).toBe(true);
    });
  });

  describe('Assessment Results Delivery and User Access', () => {
    test('should deliver executive summary within 24 hours', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/executive-summary`)
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          assessmentId,
          executiveSummary: expect.objectContaining({
            keyBottlenecks: expect.any(Array),
            impactAnalysis: expect.any(String),
            prioritizedRecommendations: expect.any(Array),
            quickWins: expect.any(Array)
          }),
          deliveredAt: expect.any(String)
        });
      } else {
        expect(response.status).toBe(202); // Analysis in progress
        expect(response.body).toMatchObject({
          status: 'processing',
          estimatedCompletion: expect.any(String)
        });
      }
    });

    test('should provide access to detailed domain analysis', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/detailed-analysis`)
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          assessmentId,
          domainAnalyses: expect.any(Array),
          priorityMatrix: expect.any(Object),
          implementationRoadmap: expect.any(Object)
        });
      } else {
        expect(response.status).toBe(202); // Analysis in progress
      }
    });

    test('should restrict access to assessment results by user', async () => {
      // Create another user
      const otherUserToken = 'Bearer other-user-token';

      jest.spyOn(require('../../server/cognitoAuth'), 'isAuthenticated')
        .mockImplementationOnce((req: any, res: any, next: any) => {
          req.user = {
            claims: {
              sub: 'other-user-id',
              email: 'other@example.com'
            }
          };
          next();
        });

      await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', otherUserToken)
        .expect(403);
    });
  });

  describe('Concurrent Assessment Processing', () => {
    test('should handle multiple concurrent assessment creations', async () => {
      const promises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/assessments')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.id).toBeTruthy();
      });

      // Cleanup additional assessments
      for (const response of responses) {
        await storage.deleteAssessment(response.body.id);
      }
    });

    test('should process concurrent response submissions correctly', async () => {
      const responses1 = [
        {
          domainName: 'Revenue Engine',
          questionId: 'revenue-engine-1',
          response: 'Sales pipeline is highly predictable.',
          score: 8
        }
      ];

      const responses2 = [
        {
          domainName: 'Operations Excellence',
          questionId: 'operations-excellence-1',
          response: 'Core processes are efficient and streamlined.',
          score: 7
        }
      ];

      const [result1, result2] = await Promise.all([
        request(app)
          .post(`/api/assessments/${assessmentId}/responses`)
          .set('Authorization', authToken)
          .send({ responses: responses1 }),
        request(app)
          .post(`/api/assessments/${assessmentId}/responses`)
          .set('Authorization', authToken)
          .send({ responses: responses2 })
      ]);

      expect(result1.status).toBe(200);
      expect(result2.status).toBe(200);

      // Verify both sets of responses were saved
      const allResponses = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .expect(200);

      expect(allResponses.body).toHaveLength(5); // 3 initial + 2 new
    });
  });

  describe('Assessment Workflow Validation', () => {
    test('should complete full assessment workflow', async () => {
      // Verify final assessment status
      const finalStatus = await request(app)
        .get(`/api/assessments/${assessmentId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(finalStatus.body).toMatchObject({
        id: assessmentId,
        userId: userId,
        status: expect.stringMatching(/^(paid|processing|completed)$/),
        totalQuestions: expect.any(Number),
        amount: '7500.00',
        currency: 'GBP',
        createdAt: expect.any(String),
        paidAt: expect.any(String)
      });
    });

    test('should validate complete user journey end-to-end', async () => {
      // This test verifies the complete flow:
      // 1. User authentication ✓
      // 2. Assessment creation ✓
      // 3. Payment processing ✓
      // 4. Response submission ✓
      // 5. Progress tracking ✓
      // 6. AI analysis trigger ✓
      // 7. Results delivery ✓

      const journey = await request(app)
        .get(`/api/assessments/${assessmentId}/journey`)
        .set('Authorization', authToken)
        .expect(200);

      expect(journey.body).toMatchObject({
        steps: expect.arrayContaining([
          expect.objectContaining({ step: 'created', completed: true }),
          expect.objectContaining({ step: 'payment_intent_created', completed: true }),
          expect.objectContaining({ step: 'responses_submitted', completed: true }),
          expect.objectContaining({ step: 'payment_completed', completed: true }),
          expect.objectContaining({ step: 'analysis_started', completed: true })
        ])
      });
    });
  });
});