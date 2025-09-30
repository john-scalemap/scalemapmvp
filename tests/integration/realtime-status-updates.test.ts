import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';

describe('Real-time Status Updates and Progress Indicators', () => {
  let authToken: string;
  let userId: string;
  let assessmentId: string;

  beforeAll(async () => {
    // Setup test user
    const mockCognitoToken = {
      sub: 'test-user-realtime-status',
      email: 'realtime.status@example.com',
      first_name: 'Realtime',
      last_name: 'Status',
      'cognito:username': 'realtimestatus',
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
      companyName: 'Realtime Status Company',
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

  describe('Assessment Status Progression Tracking', () => {
    test('should track initial assessment status as pending', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        id: assessmentId,
        status: 'pending',
        progress: 0,
        phase: 'questionnaire',
        lastUpdated: expect.any(String),
        estimatedCompletion: null,
        analysisProgress: {
          triageComplete: false,
          executiveSummaryComplete: false,
          domainAnalysisComplete: false,
          implementationKitsComplete: false
        }
      });
    });

    test('should update status as questionnaire responses are submitted', async () => {
      // Submit some responses
      const responses = [
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

      await request(app)
        .post(`/api/assessments/${assessmentId}/responses`)
        .set('Authorization', authToken)
        .send({ responses })
        .expect(200);

      // Check updated status
      const statusResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        status: 'pending',
        progress: expect.any(Number),
        phase: 'questionnaire',
        responsesSubmitted: 2,
        lastUpdated: expect.any(String)
      });

      expect(statusResponse.body.progress).toBeGreaterThan(0);
    });

    test('should transition to payment phase when questionnaire is submitted', async () => {
      // Mark assessment as submitted (simulate complete questionnaire)
      await storage.updateAssessment(assessmentId, {
        status: 'awaiting_payment' as any
      });

      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'submitted',
        phase: 'payment',
        submittedAt: expect.any(String),
        progress: 100,
        nextStep: 'Payment required to begin analysis'
      });
    });

    test('should update to analysis phase after payment completion', async () => {
      // Simulate payment completion
      await storage.updateAssessment(assessmentId, {
        status: 'paid' as any,
        paymentIntentId: 'pi_test_payment_intent'
      });

      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'paid',
        phase: 'analysis',
        paidAt: expect.any(String),
        nextStep: 'AI agents are analyzing your responses',
        estimatedCompletion: expect.any(String)
      });
    });
  });

  describe('Analysis Progress Tracking', () => {
    test('should track triage analysis completion', async () => {
      // Mark triage as complete
      await storage.updateAssessmentAnalysis(assessmentId, {
        triageCompleted: true,
        triageCompletedAt: new Date().toISOString()
      });

      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.analysisProgress).toMatchObject({
        triageComplete: true,
        triageCompletedAt: expect.any(String),
        executiveSummaryComplete: false,
        domainAnalysisComplete: false,
        implementationKitsComplete: false
      });

      expect(response.body.nextStep).toContain('Domain analysis');
    });

    test('should track domain analysis progress per agent', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/analysis-agents-status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        agents: expect.arrayContaining([
          expect.objectContaining({
            agentName: expect.any(String),
            domainName: expect.any(String),
            status: expect.stringMatching(/^(assigned|processing|completed)$/),
            startedAt: expect.any(String),
            estimatedCompletion: expect.any(String)
          })
        ]),
        overallProgress: expect.any(Number)
      });
    });

    test('should update status as individual domain analyses complete', async () => {
      // Mark one domain analysis as complete
      await storage.updateDomainAnalysis(assessmentId, 'Strategic Alignment', 85, 'excellent', 'Strategic alignment shows strong vision and execution');

      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/analysis-agents-status`)
        .set('Authorization', authToken)
        .expect(200);

      const strategicAgent = response.body.agents.find(
        (agent: any) => agent.domainName === 'Strategic Alignment'
      );

      expect(strategicAgent).toMatchObject({
        status: 'completed',
        completedAt: expect.any(String),
        agentName: 'Dr. Alexandra Chen'
      });

      expect(response.body.overallProgress).toBeGreaterThan(0);
    });

    test('should track executive summary generation progress', async () => {
      // Mark executive summary as in progress
      await storage.updateAssessmentAnalysis(assessmentId, {
        executiveSummaryInProgress: true,
        executiveSummaryStartedAt: new Date().toISOString()
      });

      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.analysisProgress).toMatchObject({
        executiveSummaryInProgress: true,
        executiveSummaryStartedAt: expect.any(String)
      });

      expect(response.body.nextStep).toContain('Executive summary');
    });
  });

  describe('Real-time Progress Indicators', () => {
    test('should provide accurate completion percentages', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/progress-indicators`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        overall: {
          percentage: expect.any(Number),
          phase: expect.any(String),
          description: expect.any(String)
        },
        questionnaire: {
          percentage: expect.any(Number),
          completed: expect.any(Boolean)
        },
        payment: {
          percentage: expect.any(Number),
          completed: expect.any(Boolean)
        },
        analysis: {
          percentage: expect.any(Number),
          stages: expect.objectContaining({
            triage: expect.any(Number),
            domainAnalysis: expect.any(Number),
            executiveSummary: expect.any(Number),
            implementationKits: expect.any(Number)
          })
        }
      });

      // Validate percentage ranges
      expect(response.body.overall.percentage).toBeGreaterThanOrEqual(0);
      expect(response.body.overall.percentage).toBeLessThanOrEqual(100);
    });

    test('should update progress indicators in real-time', async () => {
      // Get initial progress
      const initialResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/progress-indicators`)
        .set('Authorization', authToken)
        .expect(200);

      const initialProgress = initialResponse.body.analysis.percentage;

      // Complete another domain analysis
      await storage.updateDomainAnalysis(assessmentId, 'Financial Management', 78, 'good', 'Financial management processes are well-established');

      // Get updated progress
      const updatedResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/progress-indicators`)
        .set('Authorization', authToken)
        .expect(200);

      const updatedProgress = updatedResponse.body.analysis.percentage;

      expect(updatedProgress).toBeGreaterThanOrEqual(initialProgress);
    });

    test('should provide estimated completion times', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/estimated-completion`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        executiveSummary: {
          estimatedAt: expect.any(String),
          deliveryTime: '24 hours',
          status: expect.stringMatching(/^(pending|processing|completed)$/)
        },
        detailedAnalysis: {
          estimatedAt: expect.any(String),
          deliveryTime: '48 hours',
          status: expect.stringMatching(/^(pending|processing|completed)$/)
        },
        implementationKits: {
          estimatedAt: expect.any(String),
          deliveryTime: '72 hours',
          status: expect.stringMatching(/^(pending|processing|completed)$/)
        }
      });
    });
  });

  describe('Status Change Notifications', () => {
    test('should track all status changes with timestamps', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status-history`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        statusHistory: expect.arrayContaining([
          expect.objectContaining({
            status: expect.any(String),
            timestamp: expect.any(String),
            description: expect.any(String)
          })
        ])
      });

      // Should have multiple status entries
      expect(response.body.statusHistory.length).toBeGreaterThan(1);

      // Should be in chronological order
      const timestamps = response.body.statusHistory.map((h: any) => new Date(h.timestamp));
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i-1].getTime());
      }
    });

    test('should provide user-friendly status descriptions', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        statusDescription: expect.any(String),
        nextStep: expect.any(String),
        userMessage: expect.any(String)
      });

      expect(response.body.statusDescription.length).toBeGreaterThan(10);
      expect(response.body.userMessage.length).toBeGreaterThan(10);
    });

    test('should handle concurrent status requests efficiently', async () => {
      const startTime = Date.now();

      // Make multiple concurrent status requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .get(`/api/assessments/${assessmentId}/status`)
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(assessmentId);
      });

      // Should complete reasonably quickly (under 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);

      // All responses should be identical (cached)
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body.status).toBe(firstResponse.status);
        expect(response.body.progress).toBe(firstResponse.progress);
      });
    });
  });

  describe('Progress Data Consistency', () => {
    test('should maintain consistent progress data across different endpoints', async () => {
      const [statusResponse, progressResponse, indicatorsResponse] = await Promise.all([
        request(app)
          .get(`/api/assessments/${assessmentId}/status`)
          .set('Authorization', authToken),
        request(app)
          .get(`/api/assessments/${assessmentId}/progress`)
          .set('Authorization', authToken),
        request(app)
          .get(`/api/assessments/${assessmentId}/progress-indicators`)
          .set('Authorization', authToken)
      ]);

      expect(statusResponse.status).toBe(200);
      expect(progressResponse.status).toBe(200);
      expect(indicatorsResponse.status).toBe(200);

      // Progress values should be consistent
      expect(statusResponse.body.progress).toBe(progressResponse.body.progress);

      // Status should be consistent
      expect(statusResponse.body.status).toBeTruthy();
      expect(statusResponse.body.phase).toBeTruthy();
    });

    test('should validate status transitions are logical', async () => {
      const history = await request(app)
        .get(`/api/assessments/${assessmentId}/status-history`)
        .set('Authorization', authToken)
        .expect(200);

      const statusProgression = history.body.statusHistory.map((h: any) => h.status);

      // Should follow logical progression: pending -> submitted -> paid -> processing/completed
      const validTransitions = {
        'pending': ['submitted', 'paid'],
        'submitted': ['paid'],
        'paid': ['processing', 'completed'],
        'processing': ['completed']
      };

      for (let i = 1; i < statusProgression.length; i++) {
        const prevStatus = statusProgression[i-1];
        const currentStatus = statusProgression[i];

        if (prevStatus !== currentStatus) {
          expect(validTransitions[prevStatus as keyof typeof validTransitions])
            .toContain(currentStatus);
        }
      }
    });

    test('should prevent unauthorized status access', async () => {
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
        .get(`/api/assessments/${assessmentId}/status`)
        .set('Authorization', otherUserToken)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Unauthorized access to assessment'
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple assessments status tracking', async () => {
      // Create additional assessments
      const additionalAssessments = await Promise.all([
        request(app)
          .post('/api/assessments')
          .set('Authorization', authToken),
        request(app)
          .post('/api/assessments')
          .set('Authorization', authToken)
      ]);

      // Get status for all assessments
      const allStatusPromises = [
        request(app)
          .get(`/api/assessments/${assessmentId}/status`)
          .set('Authorization', authToken),
        ...additionalAssessments.map(response =>
          request(app)
            .get(`/api/assessments/${response.body.id}/status`)
            .set('Authorization', authToken)
        )
      ];

      const responses = await Promise.all(allStatusPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBeTruthy();
      });

      // Cleanup additional assessments
      for (const assessment of additionalAssessments) {
        await storage.deleteAssessment(assessment.body.id);
      }
    });

    test('should cache status data for performance', async () => {
      const startTime = Date.now();

      // Make repeated requests
      await Promise.all(Array.from({ length: 3 }, () =>
        request(app)
          .get(`/api/assessments/${assessmentId}/status`)
          .set('Authorization', authToken)
      ));

      const endTime = Date.now();

      // Should be fast due to caching
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});