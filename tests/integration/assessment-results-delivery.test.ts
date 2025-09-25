import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';

describe('Assessment Results Delivery and User Access Validation', () => {
  let authToken: string;
  let userId: string;
  let assessmentId: string;
  let otherUserId: string;
  let otherUserToken: string;

  beforeAll(async () => {
    // Setup primary test user
    const mockCognitoToken = {
      sub: 'test-user-results-delivery',
      email: 'results.delivery@example.com',
      first_name: 'Results',
      last_name: 'Delivery',
      'cognito:username': 'resultsdelivery',
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
      companyName: 'Results Delivery Company',
      industry: 'Technology',
      revenue: '$10M-$50M',
      teamSize: 75
    });

    userId = mockCognitoToken.sub;
    authToken = 'Bearer mock-jwt-token';

    // Setup second user for access control testing
    const otherCognitoToken = {
      sub: 'other-test-user',
      email: 'other.user@example.com',
      first_name: 'Other',
      last_name: 'User',
      'cognito:username': 'otheruser',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      aud: 'test-client-id',
      iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_iGWQ7N6sH'
    };

    await storage.upsertUser({
      id: otherCognitoToken.sub,
      email: otherCognitoToken.email,
      firstName: otherCognitoToken.first_name,
      lastName: otherCognitoToken.last_name,
      companyName: 'Other Company',
      industry: 'Finance',
      revenue: '$1M-$10M',
      teamSize: 30
    });

    otherUserId = otherCognitoToken.sub;
    otherUserToken = 'Bearer other-mock-jwt-token';

    // Mock JWT validation to handle both users
    jest.spyOn(require('../../server/cognitoAuth'), 'isAuthenticated')
      .mockImplementation((req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization;
        if (authHeader === authToken) {
          req.user = { claims: mockCognitoToken };
        } else if (authHeader === otherUserToken) {
          req.user = { claims: otherCognitoToken };
        } else {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });

    // Create test assessment with complete workflow
    const response = await request(app)
      .post('/api/assessments')
      .set('Authorization', authToken);

    assessmentId = response.body.id;

    // Add assessment responses
    const responses = [
      {
        domainName: 'Strategic Alignment',
        questionId: 'strategic-alignment-1',
        response: 'Strategic vision is clearly defined with quarterly reviews.',
        score: 8
      },
      {
        domainName: 'Financial Management',
        questionId: 'financial-management-1',
        response: 'Financial processes are well managed with strong forecasting.',
        score: 9
      },
      {
        domainName: 'Revenue Engine',
        questionId: 'revenue-engine-1',
        response: 'Sales pipeline needs improvement in predictability.',
        score: 5
      }
    ];

    await request(app)
      .post(`/api/assessments/${assessmentId}/responses`)
      .set('Authorization', authToken)
      .send({ responses });

    // Simulate completed analysis workflow
    await storage.updateAssessment(assessmentId, {
      status: 'completed',
      paidAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    });

    // Add mock analysis results
    await storage.saveAnalysisResults(assessmentId, {
      executiveSummary: 'Executive summary of growth bottleneck analysis.',
      triageAnalysis: {
        priorityDomains: ['Strategic Alignment', 'Revenue Engine'],
        criticalIssues: ['Strategic execution gaps', 'Sales pipeline inconsistency'],
        recommendedAgents: ['Dr. Alexandra Chen', 'Sarah Mitchell']
      },
      domainAnalyses: [
        {
          domainName: 'Strategic Alignment',
          agentName: 'Dr. Alexandra Chen',
          score: 8,
          health: 'good',
          summary: 'Strong strategic foundation with execution opportunities.',
          recommendations: ['Improve strategy communication', 'Enhance execution tracking'],
          keyInsights: ['Clear vision exists', 'Implementation gaps present'],
          quickWins: ['Weekly strategy reviews', 'Department alignment sessions'],
          riskFactors: ['Strategy drift risk', 'Execution delays']
        }
      ]
    });
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (assessmentId) {
        await storage.deleteAssessment(assessmentId);
      }
      await storage.deleteUser(userId);
      await storage.deleteUser(otherUserId);
    } catch (error) {
      console.log('Cleanup completed');
    }
  });

  describe('Executive Summary Delivery (24-hour)', () => {
    test('should deliver executive summary for completed assessment', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/executive-summary`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        assessmentId,
        executiveSummary: expect.any(String),
        keyBottlenecks: expect.any(Array),
        strategicOpportunities: expect.any(Array),
        prioritizedRecommendations: expect.any(Array),
        quickWins: expect.any(Array),
        expectedImpact: expect.any(String),
        deliveredAt: expect.any(String),
        generatedBy: expect.any(String)
      });

      expect(response.body.executiveSummary.length).toBeGreaterThan(100);
      expect(response.body.keyBottlenecks.length).toBeGreaterThan(0);
      expect(response.body.quickWins.length).toBeGreaterThan(0);
    });

    test('should include proper executive summary structure', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/executive-summary`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        summary: expect.objectContaining({
          overallHealth: expect.any(String),
          criticalBottlenecks: expect.arrayContaining([
            expect.objectContaining({
              domain: expect.any(String),
              issue: expect.any(String),
              impact: expect.any(String)
            })
          ]),
          strategicOpportunities: expect.arrayContaining([
            expect.objectContaining({
              opportunity: expect.any(String),
              potentialImpact: expect.any(String),
              priority: expect.stringMatching(/^(high|medium|low)$/)
            })
          ]),
          recommendedPrioritization: expect.any(String)
        })
      });
    });

    test('should not deliver executive summary for unpaid assessment', async () => {
      // Create unpaid assessment
      const unpaidResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken);

      const response = await request(app)
        .get(`/api/assessments/${unpaidResponse.body.id}/executive-summary`)
        .set('Authorization', authToken)
        .expect(402);

      expect(response.body).toMatchObject({
        error: 'Payment required',
        message: 'Executive summary is available after payment completion'
      });

      // Cleanup
      await storage.deleteAssessment(unpaidResponse.body.id);
    });

    test('should restrict executive summary access to assessment owner', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/executive-summary`)
        .set('Authorization', otherUserToken)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Unauthorized access to assessment results'
      });
    });
  });

  describe('Detailed Analysis Delivery (48-hour)', () => {
    test('should deliver comprehensive detailed analysis', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/detailed-analysis`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        assessmentId,
        domainAnalyses: expect.arrayContaining([
          expect.objectContaining({
            domainName: expect.any(String),
            agentName: expect.any(String),
            agentSpecialty: expect.any(String),
            score: expect.any(Number),
            health: expect.stringMatching(/^(critical|warning|good|excellent)$/),
            summary: expect.any(String),
            recommendations: expect.any(Array),
            keyInsights: expect.any(Array),
            quickWins: expect.any(Array),
            riskFactors: expect.any(Array),
            analysisDepth: expect.any(String)
          })
        ]),
        priorityMatrix: expect.objectContaining({
          highImpactLowEffort: expect.any(Array),
          highImpactHighEffort: expect.any(Array),
          lowImpactLowEffort: expect.any(Array),
          lowImpactHighEffort: expect.any(Array)
        }),
        implementationRoadmap: expect.objectContaining({
          immediate: expect.any(Array),    // 0-30 days
          shortTerm: expect.any(Array),    // 1-3 months
          mediumTerm: expect.any(Array),   // 3-6 months
          longTerm: expect.any(Array)      // 6+ months
        }),
        crossDomainInsights: expect.any(Array),
        riskAssessment: expect.any(Object),
        deliveredAt: expect.any(String)
      });
    });

    test('should provide domain-specific analysis with agent expertise', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/domain-analysis/Strategic Alignment`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        domainName: 'Strategic Alignment',
        agentProfile: expect.objectContaining({
          name: expect.any(String),
          specialty: expect.any(String),
          background: expect.any(String),
          expertise: expect.any(String),
          profileImageUrl: expect.any(String)
        }),
        analysis: expect.objectContaining({
          score: expect.any(Number),
          health: expect.any(String),
          summary: expect.any(String),
          recommendations: expect.any(Array),
          keyInsights: expect.any(Array),
          quickWins: expect.any(Array),
          riskFactors: expect.any(Array)
        }),
        supportingData: expect.objectContaining({
          assessmentResponses: expect.any(Array),
          documentsAnalyzed: expect.any(Array),
          benchmarkData: expect.any(Object)
        }),
        analysisMetadata: expect.objectContaining({
          analysisDate: expect.any(String),
          analysisVersion: expect.any(String),
          confidenceLevel: expect.any(String)
        })
      });

      // Validate score range
      expect(response.body.analysis.score).toBeGreaterThanOrEqual(1);
      expect(response.body.analysis.score).toBeLessThanOrEqual(10);
    });

    test('should not allow access to detailed analysis by unauthorized users', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/detailed-analysis`)
        .set('Authorization', otherUserToken)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Unauthorized access to assessment results'
      });
    });

    test('should provide cross-domain correlation insights', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/cross-domain-insights`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        correlations: expect.arrayContaining([
          expect.objectContaining({
            domains: expect.any(Array),
            correlationType: expect.stringMatching(/^(positive|negative|causal)$/),
            strength: expect.any(Number),
            insight: expect.any(String),
            recommendedActions: expect.any(Array)
          })
        ]),
        systemicIssues: expect.any(Array),
        synergyOpportunities: expect.any(Array),
        cascadingRisks: expect.any(Array)
      });
    });
  });

  describe('Implementation Accelerator Kits Delivery (72-hour)', () => {
    test('should deliver implementation accelerator kits', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/implementation-kits`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        assessmentId,
        acceleratorKits: expect.arrayContaining([
          expect.objectContaining({
            domainName: expect.any(String),
            priority: expect.stringMatching(/^(high|medium|low)$/),
            templates: expect.arrayContaining([
              expect.objectContaining({
                name: expect.any(String),
                type: expect.any(String),
                description: expect.any(String),
                downloadUrl: expect.any(String)
              })
            ]),
            roadmap: expect.objectContaining({
              phase1: expect.any(Object),
              phase2: expect.any(Object),
              phase3: expect.any(Object)
            }),
            metrics: expect.arrayContaining([
              expect.objectContaining({
                metricName: expect.any(String),
                currentValue: expect.any(String),
                targetValue: expect.any(String),
                measurementFrequency: expect.any(String)
              })
            ]),
            resources: expect.arrayContaining([
              expect.objectContaining({
                type: expect.any(String),
                title: expect.any(String),
                description: expect.any(String),
                url: expect.any(String)
              })
            ])
          })
        ]),
        deliveredAt: expect.any(String),
        usageInstructions: expect.any(String)
      });
    });

    test('should provide downloadable templates and tools', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/implementation-kits/Strategic Alignment/templates`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        templates: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            category: expect.any(String),
            format: expect.stringMatching(/^(excel|word|pdf|pptx)$/),
            downloadUrl: expect.any(String),
            description: expect.any(String),
            customizations: expect.any(Array)
          })
        ])
      });

      // Verify download URLs are accessible
      for (const template of response.body.templates) {
        expect(template.downloadUrl).toMatch(/^https?:\/\//);
      }
    });

    test('should include 90-day implementation roadmaps', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/implementation-roadmaps`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        roadmaps: expect.arrayContaining([
          expect.objectContaining({
            domainName: expect.any(String),
            timeline: expect.objectContaining({
              days0to30: expect.objectContaining({
                title: expect.any(String),
                objectives: expect.any(Array),
                milestones: expect.any(Array),
                deliverables: expect.any(Array),
                resources: expect.any(Array)
              }),
              days31to60: expect.objectContaining({
                title: expect.any(String),
                objectives: expect.any(Array),
                milestones: expect.any(Array),
                deliverables: expect.any(Array),
                dependencies: expect.any(Array)
              }),
              days61to90: expect.objectContaining({
                title: expect.any(String),
                objectives: expect.any(Array),
                milestones: expect.any(Array),
                successMetrics: expect.any(Array),
                nextSteps: expect.any(Array)
              })
            }),
            criticalPath: expect.any(Array),
            riskMitigations: expect.any(Array)
          })
        ])
      });
    });

    test('should restrict implementation kits access to paying customers', async () => {
      // Create unpaid assessment
      const unpaidResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken);

      const response = await request(app)
        .get(`/api/assessments/${unpaidResponse.body.id}/implementation-kits`)
        .set('Authorization', authToken)
        .expect(402);

      expect(response.body).toMatchObject({
        error: 'Payment required',
        message: 'Implementation kits are available after payment completion'
      });

      // Cleanup
      await storage.deleteAssessment(unpaidResponse.body.id);
    });
  });

  describe('Results Access Control and Security', () => {
    test('should enforce strict user isolation', async () => {
      const endpoints = [
        `/api/assessments/${assessmentId}/executive-summary`,
        `/api/assessments/${assessmentId}/detailed-analysis`,
        `/api/assessments/${assessmentId}/implementation-kits`,
        `/api/assessments/${assessmentId}/domain-analysis/Strategic Alignment`
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', otherUserToken)
          .expect(403);

        expect(response.body).toMatchObject({
          error: 'Unauthorized access to assessment results'
        });
      }
    });

    test('should validate JWT token for all results endpoints', async () => {
      const endpoints = [
        `/api/assessments/${assessmentId}/executive-summary`,
        `/api/assessments/${assessmentId}/detailed-analysis`,
        `/api/assessments/${assessmentId}/implementation-kits`
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body).toMatchObject({
          error: expect.stringContaining('Unauthorized')
        });
      }
    });

    test('should prevent access to non-existent assessments', async () => {
      const response = await request(app)
        .get('/api/assessments/non-existent-id/executive-summary')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Assessment not found'
      });
    });

    test('should audit results access attempts', async () => {
      // Access results
      await request(app)
        .get(`/api/assessments/${assessmentId}/executive-summary`)
        .set('Authorization', authToken)
        .expect(200);

      // Check audit log
      const auditResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/access-log`)
        .set('Authorization', authToken)
        .expect(200);

      expect(auditResponse.body).toMatchObject({
        accessLog: expect.arrayContaining([
          expect.objectContaining({
            userId,
            action: 'executive_summary_accessed',
            timestamp: expect.any(String),
            ipAddress: expect.any(String),
            userAgent: expect.any(String)
          })
        ])
      });
    });
  });

  describe('Results Data Quality and Completeness', () => {
    test('should ensure all analysis results meet quality standards', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/quality-check`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        qualityScore: expect.any(Number),
        completeness: expect.objectContaining({
          executiveSummary: expect.any(Boolean),
          domainAnalyses: expect.any(Number),
          implementationKits: expect.any(Number),
          crossDomainInsights: expect.any(Boolean)
        }),
        dataIntegrity: expect.objectContaining({
          scoresConsistent: expect.any(Boolean),
          recommendationsAligned: expect.any(Boolean),
          timelineRealistic: expect.any(Boolean)
        }),
        validationResults: expect.any(Array)
      });

      expect(response.body.qualityScore).toBeGreaterThanOrEqual(0.8);
      expect(response.body.completeness.domainAnalyses).toBeGreaterThan(0);
    });

    test('should provide comprehensive results summary', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/results-summary`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        overview: expect.objectContaining({
          overallScore: expect.any(Number),
          healthStatus: expect.any(String),
          criticalDomains: expect.any(Array),
          excellentDomains: expect.any(Array)
        }),
        deliverables: expect.objectContaining({
          executiveSummary: expect.objectContaining({
            delivered: expect.any(Boolean),
            deliveredAt: expect.any(String)
          }),
          detailedAnalysis: expect.objectContaining({
            delivered: expect.any(Boolean),
            domainsAnalyzed: expect.any(Number)
          }),
          implementationKits: expect.objectContaining({
            delivered: expect.any(Boolean),
            kitsGenerated: expect.any(Number)
          })
        }),
        keyTakeaways: expect.any(Array),
        nextSteps: expect.any(Array)
      });
    });

    test('should handle partial results gracefully', async () => {
      // Create assessment with partial analysis
      const partialResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken);

      const partialAssessmentId = partialResponse.body.id;

      await storage.updateAssessment(partialAssessmentId, {
        status: 'processing',
        paidAt: new Date().toISOString()
      });

      const response = await request(app)
        .get(`/api/assessments/${partialAssessmentId}/executive-summary`)
        .set('Authorization', authToken)
        .expect(202);

      expect(response.body).toMatchObject({
        status: 'processing',
        message: 'Analysis in progress',
        estimatedCompletion: expect.any(String),
        currentPhase: expect.any(String)
      });

      // Cleanup
      await storage.deleteAssessment(partialAssessmentId);
    });
  });

  describe('Results Export and Sharing', () => {
    test('should provide PDF export of complete results', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/export/pdf`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
      expect(response.body.length).toBeGreaterThan(1000); // PDF should have content
    });

    test('should generate shareable summary links with access controls', async () => {
      const response = await request(app)
        .post(`/api/assessments/${assessmentId}/share`)
        .set('Authorization', authToken)
        .send({
          shareType: 'executive_summary',
          expiresIn: '7d',
          passwordProtected: true
        })
        .expect(200);

      expect(response.body).toMatchObject({
        shareUrl: expect.stringMatching(/^https?:\/\//),
        shareToken: expect.any(String),
        expiresAt: expect.any(String),
        accessLevel: 'executive_summary',
        passwordRequired: true
      });

      // Verify shared link works
      const sharedResponse = await request(app)
        .get(`/share/${response.body.shareToken}`)
        .expect(200);

      expect(sharedResponse.body).toMatchObject({
        assessmentOverview: expect.any(Object),
        executiveSummary: expect.any(String),
        companyName: 'Results Delivery Company'
      });
    });
  });
});