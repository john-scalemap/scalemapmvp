import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';

describe('Assessment Questionnaire Progress Tracking and Data Persistence', () => {
  let authToken: string;
  let userId: string;
  let assessmentId: string;

  beforeAll(async () => {
    // Setup test user
    const mockCognitoToken = {
      sub: 'test-user-progress-tracking',
      email: 'progress.test@example.com',
      first_name: 'Progress',
      last_name: 'Test',
      'cognito:username': 'progresstest',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      aud: 'test-client-id',
      iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_iGWQ7N6sH'
    };

    await storage.upsertUser({
      id: mockCognitoToken.sub,
      email: mockCognitoToken.email,
      firstName: mockCognitoToken.first_name,
      lastName: mockCognitoToken.last_name,
      companyName: 'Progress Test Company',
      industry: 'Technology',
      revenue: '$1M-$10M',
      teamSize: 30
    });

    userId = mockCognitoToken.sub;
    authToken = 'Bearer mock-jwt-token';

    // Mock JWT validation
    jest.spyOn(require('../../server/cognitoAuth'), 'isAuthenticated')
      .mockImplementation((req: any, res: any, next: any) => {
        req.user = { claims: mockCognitoToken };
        next();
      });

    // Create test assessment
    const response = await request(app)
      .post('/api/assessments')
      .set('Authorization', authToken);

    assessmentId = response.body.id;
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

  describe('Progress Calculation and Tracking', () => {
    test('should start with 0% progress for new assessment', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/progress`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        assessmentId,
        totalQuestions: expect.any(Number),
        answeredQuestions: 0,
        progress: 0,
        domains: expect.any(Array)
      });

      expect(response.body.totalQuestions).toBeGreaterThan(0);
    });

    test('should calculate progress correctly as responses are submitted', async () => {
      // Submit responses for Strategic Alignment domain (first 5 questions)
      const strategicResponses = [
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-1',
          response: 'Our strategic vision is clearly defined and communicated.',
          score: 8
        },
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-2',
          response: 'Leadership priorities are well aligned with strategy.',
          score: 7
        },
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-3',
          response: 'Strategy translates effectively to operational decisions.',
          score: 6
        },
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-4',
          response: 'All departments understand their strategic role.',
          score: 7
        },
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-5',
          response: 'We review strategic priorities quarterly.',
          score: 8
        }
      ];

      const submitResponse = await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses: strategicResponses })
        .expect(200);

      expect(submitResponse.body).toMatchObject({
        message: 'Assessment responses saved successfully',
        progress: expect.any(Number),
        responsesCount: 5
      });

      // Verify progress was updated
      const progressResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/progress`)
        .set('Authorization', authToken)
        .expect(200);

      expect(progressResponse.body.answeredQuestions).toBe(5);
      expect(progressResponse.body.progress).toBeGreaterThan(0);
      expect(progressResponse.body.progress).toBeLessThan(100);

      // Check domain-specific progress
      const strategicDomain = progressResponse.body.domains.find(
        (d: any) => d.name === 'Strategic Alignment'
      );
      expect(strategicDomain).toMatchObject({
        name: 'Strategic Alignment',
        totalQuestions: expect.any(Number),
        answeredQuestions: 5,
        progress: expect.any(Number),
        averageScore: expect.any(Number)
      });
      expect(strategicDomain.averageScore).toBeCloseTo(7.2, 1); // (8+7+6+7+8)/5 = 7.2
    });

    test('should track progress across multiple domains', async () => {
      // Submit responses for Financial Management domain
      const financialResponses = [
        {
          domainName: 'Financial Management',
          questionId: 'financial-management-1',
          response: 'Cash flow is highly predictable with detailed forecasting.',
          score: 9
        },
        {
          domainName: 'Financial Management',
          questionId: 'financial-management-2',
          response: 'Financial forecasts are accurate within 5% variance.',
          score: 8
        },
        {
          domainName: 'Financial Management',
          questionId: 'financial-management-3',
          response: 'Unit economics are tracked and optimized monthly.',
          score: 7
        }
      ];

      await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses: financialResponses })
        .expect(200);

      const progressResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/progress`)
        .set('Authorization', authToken)
        .expect(200);

      expect(progressResponse.body.answeredQuestions).toBe(8); // 5 + 3

      // Check both domains have progress
      const domains = progressResponse.body.domains;
      const strategicDomain = domains.find((d: any) => d.name === 'Strategic Alignment');
      const financialDomain = domains.find((d: any) => d.name === 'Financial Management');

      expect(strategicDomain.answeredQuestions).toBe(5);
      expect(financialDomain.answeredQuestions).toBe(3);
      expect(financialDomain.averageScore).toBeCloseTo(8, 1); // (9+8+7)/3 = 8
    });

    test('should calculate overall completion percentage correctly', async () => {
      const progressResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/progress`)
        .set('Authorization', authToken)
        .expect(200);

      const expectedProgress = Math.round(
        (progressResponse.body.answeredQuestions / progressResponse.body.totalQuestions) * 100
      );

      expect(progressResponse.body.progress).toBe(expectedProgress);
      expect(progressResponse.body.progress).toBeGreaterThan(0);
      expect(progressResponse.body.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Data Persistence Across Sessions', () => {
    test('should persist responses across multiple sessions', async () => {
      // Simulate user logging out and back in by making new request
      const sessionResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(sessionResponse.body)).toBe(true);
      expect(sessionResponse.body).toHaveLength(8); // 5 strategic + 3 financial

      // Verify specific response data is preserved
      const strategicResponse = sessionResponse.body.find(
        (r: any) => r.questionId === 'strategic-alignment-1'
      );
      expect(strategicResponse).toMatchObject({
        domainName: 'Strategic Alignment',
        questionId: 'strategic-alignment-1',
        response: 'Our strategic vision is clearly defined and communicated.',
        score: 8,
        submittedAt: expect.any(String)
      });
    });

    test('should allow updating existing responses', async () => {
      // Update an existing response
      const updatedResponse = [
        {
          domainName: 'Strategic Alignment',
          questionId: 'strategic-alignment-1',
          response: 'Updated: Our strategic vision is exceptionally clear and well-communicated across all levels.',
          score: 9
        }
      ];

      await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses: updatedResponse })
        .expect(200);

      // Verify the response was updated
      const responses = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .expect(200);

      const updatedResponseData = responses.body.find(
        (r: any) => r.questionId === 'strategic-alignment-1'
      );
      expect(updatedResponseData).toMatchObject({
        response: expect.stringContaining('Updated: Our strategic vision'),
        score: 9
      });

      // Verify total count didn't change (it's an update, not new response)
      expect(responses.body).toHaveLength(8);
    });

    test('should preserve progress when assessment is resumed', async () => {
      // Add more responses to different domain
      const operationsResponses = [
        {
          domainName: 'Operations Excellence',
          questionId: 'operations-excellence-1',
          response: 'Our core processes are highly efficient and streamlined.',
          score: 8
        },
        {
          domainName: 'Operations Excellence',
          questionId: 'operations-excellence-2',
          response: 'All procedures are well documented and standardized.',
          score: 7
        }
      ];

      await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses: operationsResponses })
        .expect(200);

      // Simulate resuming assessment - check progress is maintained
      const resumeProgress = await request(app)
        .get(`/api/assessments/${assessmentId}/progress`)
        .set('Authorization', authToken)
        .expect(200);

      expect(resumeProgress.body.answeredQuestions).toBe(10); // 8 + 2

      const operationsDomain = resumeProgress.body.domains.find(
        (d: any) => d.name === 'Operations Excellence'
      );
      expect(operationsDomain.answeredQuestions).toBe(2);
      expect(operationsDomain.averageScore).toBeCloseTo(7.5, 1); // (8+7)/2 = 7.5
    });

    test('should handle concurrent response submissions correctly', async () => {
      // Simulate two different domains being answered simultaneously
      const revenueResponses = [
        {
          domainName: 'Revenue Engine',
          questionId: 'revenue-engine-1',
          response: 'Sales pipeline is highly predictable and well-managed.',
          score: 8
        }
      ];

      const peopleResponses = [
        {
          domainName: 'People & Organization',
          questionId: 'people-organization-1',
          response: 'Recruitment and onboarding processes are excellent.',
          score: 7
        }
      ];

      // Submit both simultaneously
      const [revenueResult, peopleResult] = await Promise.all([
        request(app)
          .post(`/api/assessments/${assessmentId}/responses`)
          .set('Authorization', authToken)
          .send({ responses: revenueResponses }),
        request(app)
          .post(`/api/assessments/${assessmentId}/responses`)
          .set('Authorization', authToken)
          .send({ responses: peopleResponses })
      ]);

      expect(revenueResult.status).toBe(200);
      expect(peopleResult.status).toBe(200);

      // Verify both responses were saved
      const allResponses = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .expect(200);

      expect(allResponses.body).toHaveLength(12); // 10 + 2

      const revenueResponse = allResponses.body.find(
        (r: any) => r.questionId === 'revenue-engine-1'
      );
      const peopleResponse = allResponses.body.find(
        (r: any) => r.questionId === 'people-organization-1'
      );

      expect(revenueResponse).toBeTruthy();
      expect(peopleResponse).toBeTruthy();
    });
  });

  describe('Data Validation and Integrity', () => {
    test('should validate response data format', async () => {
      const invalidResponses = [
        {
          domainName: 'Technology & Data',
          questionId: 'tech-data-1',
          response: 'Technology systems support operations well.',
          score: 15 // Invalid score > 10
        }
      ];

      const response = await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses: invalidResponses })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Invalid score')
      });
    });

    test('should require all mandatory fields for responses', async () => {
      const incompleteResponses = [
        {
          domainName: 'Technology & Data',
          questionId: 'tech-data-1',
          // Missing response and score
        }
      ];

      const response = await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses: incompleteResponses })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Missing required fields')
      });
    });

    test('should prevent submission to non-existent assessment', async () => {
      const responses = [
        {
          domainName: 'Technology & Data',
          questionId: 'tech-data-1',
          response: 'Technology systems are excellent.',
          score: 9
        }
      ];

      const response = await request(app)
        .post('/api/assessments/non-existent-id/responses')
        .set('Authorization', authToken)
        .send({ responses })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Assessment not found'
      });
    });

    test('should prevent unauthorized access to assessment responses', async () => {
      // Try to access with different user
      const otherUserToken = 'Bearer other-user-token';

      jest.spyOn(require('../../server/cognitoAuth'), 'isAuthenticated')
        .mockImplementationOnce((req: any, res: any, next: any) => {
          req.user = {
            claims: {
              sub: 'unauthorized-user-id',
              email: 'unauthorized@example.com'
            }
          };
          next();
        });

      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', otherUserToken)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Unauthorized access to assessment'
      });
    });
  });

  describe('Assessment Completion Detection', () => {
    test('should detect when assessment is fully completed', async () => {
      // Get total questions to calculate how many more we need
      const progressResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/progress`)
        .set('Authorization', authToken)
        .expect(200);

      const totalQuestions = progressResponse.body.totalQuestions;
      const answered = progressResponse.body.answeredQuestions;
      const remaining = totalQuestions - answered;

      // Submit responses for remaining questions
      const remainingResponses = [];
      for (let i = 0; i < Math.min(remaining, 10); i++) {
        remainingResponses.push({
          domainName: 'Customer Success',
          questionId: `customer-success-${i + 1}`,
          response: `Customer satisfaction is well managed in area ${i + 1}.`,
          score: 7 + (i % 3) // Vary scores between 7-9
        });
      }

      const submitResponse = await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses: remainingResponses })
        .expect(200);

      // Check if assessment is marked as completed
      if (submitResponse.body.progress >= 100) {
        expect(submitResponse.body).toMatchObject({
          message: 'Assessment responses saved successfully',
          progress: 100,
          completed: true
        });

        // Verify assessment status updated
        const assessmentResponse = await request(app)
          .get(`/api/assessments/${assessmentId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(assessmentResponse.body.status).toBe('submitted');
        expect(assessmentResponse.body.submittedAt).toBeTruthy();
      }
    });

    test('should maintain response integrity throughout completion', async () => {
      const finalResponses = await request(app)
        .get(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .expect(200);

      // Verify all responses are valid and contain required fields
      finalResponses.body.forEach((response: any) => {
        expect(response).toMatchObject({
          assessmentId,
          domainName: expect.any(String),
          questionId: expect.any(String),
          response: expect.any(String),
          score: expect.any(Number),
          submittedAt: expect.any(String)
        });

        expect(response.score).toBeGreaterThanOrEqual(1);
        expect(response.score).toBeLessThanOrEqual(10);
        expect(response.response.length).toBeGreaterThan(0);
      });
    });
  });
});