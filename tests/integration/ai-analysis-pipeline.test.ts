import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';
import {
  analyzeDomain,
  generateExecutiveSummary,
  performTriageAnalysis,
  OPERATIONAL_DOMAINS,
  AI_AGENTS
} from '../../server/openai';

// Mock OpenAI to avoid actual API calls in tests
jest.mock('../../server/openai', () => ({
  ...jest.requireActual('../../server/openai'),
  analyzeDomain: jest.fn(),
  generateExecutiveSummary: jest.fn(),
  performTriageAnalysis: jest.fn()
}));

const mockAnalyzeDomain = analyzeDomain as jest.MockedFunction<typeof analyzeDomain>;
const mockGenerateExecutiveSummary = generateExecutiveSummary as jest.MockedFunction<typeof generateExecutiveSummary>;
const mockPerformTriageAnalysis = performTriageAnalysis as jest.MockedFunction<typeof performTriageAnalysis>;

describe('AI Analysis Pipeline Integration', () => {
  let authToken: string;
  let userId: string;
  let assessmentId: string;
  let paymentIntentId: string;

  beforeAll(async () => {
    // Setup test user
    const mockCognitoToken = {
      sub: 'test-user-ai-pipeline',
      email: 'ai.pipeline@example.com',
      first_name: 'AI',
      last_name: 'Pipeline',
      'cognito:username': 'aipipeline',
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
      companyName: 'AI Test Company',
      industry: 'Technology',
      revenue: '$10M-$50M',
      teamSize: 75
    });

    userId = mockCognitoToken.sub;
    authToken = 'Bearer mock-jwt-token';

    // Mock JWT validation
    jest.spyOn(require('../../server/cognitoAuth'), 'isAuthenticated')
      .mockImplementation((req: any, res: any, next: any) => {
        req.user = { claims: mockCognitoToken };
        next();
      });

    // Create test assessment with responses
    const response = await request(app)
      .post('/api/assessments')
      .set('Authorization', authToken);

    assessmentId = response.body.id;

    // Add some assessment responses
    const sampleResponses = [
      {
        domainName: 'Strategic Alignment',
        questionId: 'strategic-alignment-1',
        response: 'Our strategic vision is clearly defined but needs better execution.',
        score: 6
      },
      {
        domainName: 'Financial Management',
        questionId: 'financial-management-1',
        response: 'Cash flow management is excellent with strong forecasting.',
        score: 9
      },
      {
        domainName: 'Revenue Engine',
        questionId: 'revenue-engine-1',
        response: 'Sales pipeline is somewhat predictable but lacks consistency.',
        score: 5
      }
    ];

    await request(app)
      .post(`/api/assessments/${assessmentId}/responses`)
      .set('Authorization', authToken)
      .send({ responses: sampleResponses });

    // Create payment intent
    const paymentResponse = await request(app)
      .post('/api/create-payment-intent')
      .set('Authorization', authToken)
      .send({ assessmentId });

    paymentIntentId = paymentResponse.body.paymentIntentId;

    // Setup OpenAI mocks
    mockAnalyzeDomain.mockResolvedValue({
      score: 7,
      health: 'good',
      summary: 'Domain analysis shows good performance with room for improvement.',
      recommendations: ['Implement process improvements', 'Enhance team training'],
      keyInsights: ['Strong foundation exists', 'Minor gaps in execution'],
      quickWins: ['Quick process optimization', 'Team communication improvement'],
      riskFactors: ['Resource constraints', 'Market volatility']
    });

    mockGenerateExecutiveSummary.mockResolvedValue(
      'Executive Summary: The company shows strong potential with key areas for strategic improvement.'
    );

    mockPerformTriageAnalysis.mockResolvedValue({
      priorityDomains: ['Strategic Alignment', 'Revenue Engine'],
      criticalIssues: ['Strategic execution gaps', 'Inconsistent sales pipeline'],
      recommendedAgents: ['Dr. Alexandra Chen', 'Sarah Mitchell']
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

  describe('Payment-Triggered Analysis Pipeline', () => {
    test('should trigger triage analysis after successful payment', async () => {
      // Simulate successful payment webhook
      const webhookPayload = {
        id: 'evt_test_payment_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            status: 'succeeded',
            metadata: {
              assessmentId: assessmentId,
              userId: userId
            }
          }
        },
        created: Math.floor(Date.now() / 1000)
      };

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock-signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.received).toBe(true);

      // Wait for analysis to be triggered
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify triage analysis was called
      expect(mockPerformTriageAnalysis).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          companyName: 'AI Test Company',
          industry: 'Technology',
          revenue: '$10M-$50M',
          teamSize: 75
        })
      );
    });

    test('should initiate domain analysis for priority domains', async () => {
      // Check analysis status
      const statusResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/analysis-status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        status: expect.stringMatching(/^(processing|completed)$/),
        triageCompleted: true,
        analysisStarted: expect.any(String)
      });

      // Verify domain analysis was triggered for priority domains
      expect(mockAnalyzeDomain).toHaveBeenCalledWith(
        'Strategic Alignment',
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          companyName: 'AI Test Company',
          industry: 'Technology'
        })
      );
    });

    test('should not trigger analysis for unpaid assessments', async () => {
      // Create another assessment without payment
      const unpaidResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken);

      const unpaidAssessmentId = unpaidResponse.body.id;

      // Try to get analysis status
      const statusResponse = await request(app)
        .get(`/api/assessments/${unpaidAssessmentId}/analysis-status`)
        .set('Authorization', authToken)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        status: 'pending_payment',
        analysisStarted: null
      });

      // Cleanup
      await storage.deleteAssessment(unpaidAssessmentId);
    });
  });

  describe('AI Agent Assignment and Processing', () => {
    test('should assign appropriate AI agents to domain analysis', async () => {
      const analysisResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/agent-assignments`)
        .set('Authorization', authToken)
        .expect(200);

      expect(analysisResponse.body).toMatchObject({
        assignments: expect.arrayContaining([
          expect.objectContaining({
            domainName: expect.any(String),
            agentName: expect.any(String),
            agentSpecialty: expect.any(String),
            status: expect.stringMatching(/^(assigned|processing|completed)$/)
          })
        ])
      });

      // Verify agents match domain expertise
      const strategicAssignment = analysisResponse.body.assignments.find(
        (a: any) => a.domainName === 'Strategic Alignment'
      );
      expect(strategicAssignment?.agentName).toBe('Dr. Alexandra Chen');
    });

    test('should track analysis progress per domain', async () => {
      const progressResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/analysis-progress`)
        .set('Authorization', authToken)
        .expect(200);

      expect(progressResponse.body).toMatchObject({
        overallProgress: expect.any(Number),
        domainProgress: expect.arrayContaining([
          expect.objectContaining({
            domainName: expect.any(String),
            status: expect.stringMatching(/^(pending|processing|completed)$/),
            completedAt: expect.any(String)
          })
        ])
      });

      expect(progressResponse.body.overallProgress).toBeGreaterThanOrEqual(0);
      expect(progressResponse.body.overallProgress).toBeLessThanOrEqual(100);
    });

    test('should handle AI analysis errors gracefully', async () => {
      // Mock an AI analysis error
      mockAnalyzeDomain.mockRejectedValueOnce(new Error('OpenAI API error'));

      const errorResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/domain-analysis/Strategic Alignment`)
        .set('Authorization', authToken);

      if (errorResponse.status === 200) {
        // Should return fallback analysis
        expect(errorResponse.body).toMatchObject({
          score: expect.any(Number),
          health: expect.any(String),
          summary: expect.stringContaining('analysis'),
          recommendations: expect.any(Array)
        });
      } else {
        expect(errorResponse.status).toBe(202); // Processing
      }
    });
  });

  describe('Analysis Results Generation', () => {
    test('should generate executive summary after domain analyses complete', async () => {
      // Mock all domain analyses as completed
      mockAnalyzeDomain.mockResolvedValue({
        score: 8,
        health: 'excellent',
        summary: 'Excellent performance in this domain.',
        recommendations: ['Maintain current practices', 'Scale successful processes'],
        keyInsights: ['Strong competitive advantage', 'Efficient operations'],
        quickWins: ['Document best practices', 'Share learnings'],
        riskFactors: ['Complacency risk', 'Scalability challenges']
      });

      const summaryResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/executive-summary`)
        .set('Authorization', authToken);

      if (summaryResponse.status === 200) {
        expect(summaryResponse.body).toMatchObject({
          executiveSummary: expect.any(String),
          generatedAt: expect.any(String),
          keyBottlenecks: expect.any(Array),
          quickWins: expect.any(Array)
        });

        expect(mockGenerateExecutiveSummary).toHaveBeenCalled();
      } else {
        expect(summaryResponse.status).toBe(202); // Still processing
      }
    });

    test('should provide detailed domain analysis results', async () => {
      const detailResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/detailed-analysis`)
        .set('Authorization', authToken);

      if (detailResponse.status === 200) {
        expect(detailResponse.body).toMatchObject({
          domainAnalyses: expect.arrayContaining([
            expect.objectContaining({
              domainName: expect.any(String),
              agentName: expect.any(String),
              score: expect.any(Number),
              health: expect.any(String),
              summary: expect.any(String),
              recommendations: expect.any(Array),
              keyInsights: expect.any(Array)
            })
          ]),
          priorityMatrix: expect.any(Object),
          implementationRoadmap: expect.any(Object)
        });
      } else {
        expect(detailResponse.status).toBe(202); // Analysis in progress
      }
    });

    test('should generate implementation accelerator kits', async () => {
      const kitsResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/implementation-kits`)
        .set('Authorization', authToken);

      if (kitsResponse.status === 200) {
        expect(kitsResponse.body).toMatchObject({
          acceleratorKits: expect.arrayContaining([
            expect.objectContaining({
              domainName: expect.any(String),
              templates: expect.any(Array),
              roadmap: expect.any(Object),
              metrics: expect.any(Array),
              resources: expect.any(Array)
            })
          ]),
          generatedAt: expect.any(String)
        });
      } else {
        expect(kitsResponse.status).toBe(202); // Still being generated
      }
    });
  });

  describe('Analysis Quality and Validation', () => {
    test('should validate AI response format and content', async () => {
      const domainResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/domain-analysis/Financial Management`)
        .set('Authorization', authToken);

      if (domainResponse.status === 200) {
        const analysis = domainResponse.body;

        // Validate required fields
        expect(analysis).toMatchObject({
          score: expect.any(Number),
          health: expect.stringMatching(/^(critical|warning|good|excellent)$/),
          summary: expect.any(String),
          recommendations: expect.any(Array),
          keyInsights: expect.any(Array),
          quickWins: expect.any(Array),
          riskFactors: expect.any(Array)
        });

        // Validate score range
        expect(analysis.score).toBeGreaterThanOrEqual(1);
        expect(analysis.score).toBeLessThanOrEqual(10);

        // Validate health mapping
        if (analysis.score >= 8) expect(analysis.health).toBe('excellent');
        else if (analysis.score >= 6) expect(analysis.health).toBe('good');
        else if (analysis.score >= 4) expect(analysis.health).toBe('warning');
        else expect(analysis.health).toBe('critical');

        // Validate content quality
        expect(analysis.summary.length).toBeGreaterThan(50);
        expect(analysis.recommendations.length).toBeGreaterThan(0);
        expect(analysis.keyInsights.length).toBeGreaterThan(0);
      }
    });

    test('should ensure consistent analysis across multiple runs', async () => {
      // Get analysis multiple times to check consistency
      const results = await Promise.all([
        request(app)
          .get(`/api/assessments/${assessmentId}/domain-analysis/Revenue Engine`)
          .set('Authorization', authToken),
        request(app)
          .get(`/api/assessments/${assessmentId}/domain-analysis/Revenue Engine`)
          .set('Authorization', authToken)
      ]);

      if (results[0].status === 200 && results[1].status === 200) {
        // Results should be identical (cached)
        expect(results[0].body).toEqual(results[1].body);
      }
    });

    test('should provide analysis timing and delivery guarantees', async () => {
      const timingResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/delivery-timeline`)
        .set('Authorization', authToken)
        .expect(200);

      expect(timingResponse.body).toMatchObject({
        executiveSummary: {
          deliveryTime: '24 hours',
          estimatedCompletion: expect.any(String),
          status: expect.stringMatching(/^(completed|processing|pending)$/)
        },
        detailedAnalysis: {
          deliveryTime: '48 hours',
          estimatedCompletion: expect.any(String),
          status: expect.stringMatching(/^(completed|processing|pending)$/)
        },
        implementationKits: {
          deliveryTime: '72 hours',
          estimatedCompletion: expect.any(String),
          status: expect.stringMatching(/^(completed|processing|pending)$/)
        }
      });
    });
  });

  describe('Analysis Data Integration', () => {
    test('should incorporate assessment responses in analysis', async () => {
      expect(mockAnalyzeDomain).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            domainName: expect.any(String),
            response: expect.any(String),
            score: expect.any(Number)
          })
        ]),
        expect.any(Array), // documents
        expect.any(Object)  // company context
      );
    });

    test('should include uploaded documents in analysis', async () => {
      // Upload a test document
      const uploadResponse = await request(app)
        .post('/api/objects/upload')
        .set('Authorization', authToken)
        .expect(200);

      const documentData = {
        fileName: 'test-financial-report.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        uploadURL: uploadResponse.body.uploadURL
      };

      await request(app)
        .post(`/api/assessments/${assessmentId}/documents`)
        .set('Authorization', authToken)
        .send(documentData)
        .expect(200);

      // Verify document is included in analysis
      expect(mockAnalyzeDomain).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.arrayContaining([
          expect.objectContaining({
            fileName: 'test-financial-report.pdf',
            fileType: 'application/pdf'
          })
        ]),
        expect.any(Object)
      );
    });

    test('should use company context in analysis generation', async () => {
      expect(mockAnalyzeDomain).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          companyName: 'AI Test Company',
          industry: 'Technology',
          revenue: '$10M-$50M',
          teamSize: 75
        })
      );
    });
  });
});