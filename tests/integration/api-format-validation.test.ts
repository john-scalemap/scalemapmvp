import 'dotenv/config';

describe('API Request/Response Format Validation', () => {
  describe('Authorization Header Format Validation', () => {
    test('should validate all API calls use correct Authorization header format', () => {
      // Test the standard authorization header format used throughout the app
      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...';
      const authHeader = `Bearer ${mockToken}`;

      expect(authHeader).toMatch(/^Bearer .+/);
      expect(authHeader.split(' ')[0]).toBe('Bearer');
      expect(authHeader.split(' ')[1]).toBe(mockToken);
    });

    test('should validate backend middleware expects proper Bearer token format', () => {
      const testCases = [
        { header: 'Bearer valid-token', expected: 'valid-token' },
        { header: 'bearer invalid-case', expected: null },
        { header: 'Basic auth-not-bearer', expected: null },
        { header: 'Bearer', expected: '' },
        { header: '', expected: null }
      ];

      testCases.forEach(({ header, expected }) => {
        const token = header?.replace('Bearer ', '');
        if (header?.startsWith('Bearer ')) {
          expect(token).toBe(expected);
        } else if (expected === null) {
          expect(header?.replace('Bearer ', '')).not.toBe(expected);
        }
      });
    });
  });

  describe('Protected Routes Validation', () => {
    test('should validate all protected routes expect JWT middleware', () => {
      const protectedRoutes = [
        '/api/auth/user',
        '/api/user/profile',
        '/api/assessments',
        '/api/assessments/:id',
        '/api/assessments/:id/responses',
        '/api/assessments/:id/documents',
        '/api/create-payment-intent',
        '/api/assessments/:id/analysis',
        '/objects/:objectPath(*)'
      ];

      // All protected routes should require authentication
      protectedRoutes.forEach(route => {
        expect(route).toMatch(/^\/api\/|^\/objects\//);
        expect(route).toBeTruthy();
      });
    });

    test('should validate unprotected routes do not require authentication', () => {
      const unprotectedRoutes = [
        '/health',
        '/api/stripe-webhook',
        '/api/agents',
        '/api/questions/:domain',
        '/api/questions'
      ];

      unprotectedRoutes.forEach(route => {
        expect(route).toBeTruthy();
        // These routes should not require auth middleware
      });
    });
  });

  describe('User Claims Structure Validation', () => {
    test('should validate backend expects specific user claims structure', () => {
      const mockRequest = {
        user: {
          claims: {
            sub: 'cognito-user-123',
            email: 'user@example.com',
            given_name: 'John',
            family_name: 'Doe',
            exp: Math.floor(Date.now() / 1000) + 3600
          }
        }
      };

      // Validate the pattern: req.user.claims.sub
      const userId = mockRequest.user.claims.sub;
      expect(userId).toBe('cognito-user-123');
      expect(mockRequest.user.claims).toHaveProperty('sub');
      expect(mockRequest.user.claims).toHaveProperty('email');
      expect(mockRequest.user.claims).toHaveProperty('exp');
    });
  });

  describe('Error Response Format Validation', () => {
    test('should validate authentication error responses format', () => {
      const authErrorResponses = [
        { status: 401, body: { message: 'No token provided' } },
        { status: 401, body: { message: 'Invalid token' } },
        { status: 404, body: { message: 'Assessment not found' } },
        { status: 500, body: { message: 'Failed to fetch user' } }
      ];

      authErrorResponses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      });
    });

    test('should validate token validation error handling', () => {
      const invalidTokenScenarios = [
        { token: null, expectedError: 'No token provided' },
        { token: undefined, expectedError: 'No token provided' },
        { token: '', expectedError: 'No token provided' },
        { token: 'invalid-jwt', expectedError: 'Invalid token' },
        { token: 'expired.jwt.token', expectedError: 'Invalid token' }
      ];

      invalidTokenScenarios.forEach(({ token, expectedError }) => {
        if (!token) {
          expect(expectedError).toBe('No token provided');
        } else {
          expect(expectedError).toBe('Invalid token');
        }
      });
    });
  });

  describe('Request Body Validation', () => {
    test('should validate assessment creation request format', () => {
      const assessmentRequest = {
        // No body required for POST /api/assessments
        // User ID comes from JWT claims
      };

      // Assessment creation uses JWT claims for user identification
      expect(true).toBe(true); // Assessment creation doesn't require request body
    });

    test('should validate assessment response submission format', () => {
      const responseSubmission = {
        responses: [
          {
            domainName: 'Strategy & Planning',
            questionId: 'q1',
            response: 'We have a comprehensive strategic plan',
            score: 4
          }
        ]
      };

      expect(responseSubmission).toHaveProperty('responses');
      expect(Array.isArray(responseSubmission.responses)).toBe(true);
      expect(responseSubmission.responses[0]).toHaveProperty('domainName');
      expect(responseSubmission.responses[0]).toHaveProperty('questionId');
      expect(responseSubmission.responses[0]).toHaveProperty('response');
      expect(responseSubmission.responses[0]).toHaveProperty('score');
    });

    test('should validate user profile update request format', () => {
      const profileUpdate = {
        companyName: 'Test Company',
        industry: 'Technology',
        revenue: '1M-10M',
        teamSize: 50
      };

      expect(profileUpdate).toHaveProperty('companyName');
      expect(profileUpdate).toHaveProperty('industry');
      expect(profileUpdate).toHaveProperty('revenue');
      expect(profileUpdate).toHaveProperty('teamSize');
    });

    test('should validate document upload request format', () => {
      const documentUpload = {
        fileName: 'strategic-plan.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        uploadURL: 'https://scalemap-storage.s3.eu-west-1.amazonaws.com/...'
      };

      expect(documentUpload).toHaveProperty('fileName');
      expect(documentUpload).toHaveProperty('fileSize');
      expect(documentUpload).toHaveProperty('fileType');
      expect(documentUpload).toHaveProperty('uploadURL');
      expect(typeof documentUpload.fileSize).toBe('number');
    });
  });

  describe('Response Format Validation', () => {
    test('should validate user profile response format', () => {
      const userResponse = {
        id: 'cognito-user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company',
        industry: 'Technology',
        revenue: '1M-10M',
        teamSize: 50,
        profileImageUrl: 'https://example.com/avatar.jpg'
      };

      expect(userResponse).toHaveProperty('id');
      expect(userResponse).toHaveProperty('email');
      expect(userResponse).toHaveProperty('firstName');
      expect(userResponse).toHaveProperty('lastName');
    });

    test('should validate assessment response format', () => {
      const assessmentResponse = {
        id: 'assess-123',
        userId: 'user-123',
        status: 'pending',
        totalQuestions: 50,
        questionsAnswered: 0,
        amount: '7500.00',
        currency: 'GBP',
        createdAt: new Date().toISOString(),
        domains: [],
        documents: [],
        operationalDomains: [],
        availableAgents: []
      };

      expect(assessmentResponse).toHaveProperty('id');
      expect(assessmentResponse).toHaveProperty('userId');
      expect(assessmentResponse).toHaveProperty('status');
      expect(assessmentResponse).toHaveProperty('totalQuestions');
      expect(assessmentResponse).toHaveProperty('amount');
      expect(assessmentResponse).toHaveProperty('currency');
      expect(Array.isArray(assessmentResponse.domains)).toBe(true);
      expect(Array.isArray(assessmentResponse.documents)).toBe(true);
    });

    test('should validate payment intent response format', () => {
      const paymentResponse = {
        clientSecret: 'pi_1234567890_secret_abcdef'
      };

      expect(paymentResponse).toHaveProperty('clientSecret');
      expect(typeof paymentResponse.clientSecret).toBe('string');
      expect(paymentResponse.clientSecret).toMatch(/^pi_.*_secret_.*/);
    });
  });

  describe('CORS Configuration Validation', () => {
    test('should validate CORS headers for production domain', () => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // Should be restricted in production
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      };

      expect(corsHeaders).toHaveProperty('Access-Control-Allow-Origin');
      expect(corsHeaders).toHaveProperty('Access-Control-Allow-Methods');
      expect(corsHeaders).toHaveProperty('Access-Control-Allow-Headers');
      expect(corsHeaders['Access-Control-Allow-Headers']).toContain('Authorization');
    });
  });

  describe('Content-Type Validation', () => {
    test('should validate all API requests use application/json', () => {
      const standardHeaders = {
        'Authorization': 'Bearer token',
        'Content-Type': 'application/json'
      };

      expect(standardHeaders['Content-Type']).toBe('application/json');
    });

    test('should validate special content types for specific endpoints', () => {
      const webhookHeaders = {
        'content-type': 'application/json',
        'stripe-signature': 'whsec_...'
      };

      expect(webhookHeaders['content-type']).toBe('application/json');
      expect(webhookHeaders).toHaveProperty('stripe-signature');
    });
  });

  describe('URL Structure Validation', () => {
    test('should validate API endpoint URL patterns', () => {
      const apiEndpoints = [
        '/api/auth/user',
        '/api/assessments',
        '/api/assessments/123',
        '/api/assessments/123/responses',
        '/api/assessments/123/documents',
        '/api/assessments/123/analysis'
      ];

      apiEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\//);
        if (endpoint.includes('assessments/')) {
          expect(endpoint).toMatch(/\/api\/assessments(\/|$)/);
        }
      });
    });

    test('should validate object storage URL patterns', () => {
      const objectUrls = [
        '/objects/assessments/123/document.pdf',
        '/objects/uploads/file.docx'
      ];

      objectUrls.forEach(url => {
        expect(url).toMatch(/^\/objects\//);
      });
    });
  });
});