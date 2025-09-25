import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';
import Stripe from 'stripe';

// Initialize Stripe with test key for production validation
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

describe('Stripe Payment Integration - Production Mode Validation', () => {
  let authToken: string;
  let userId: string;
  let assessmentId: string;
  let paymentIntentId: string;
  let clientSecret: string;

  beforeAll(async () => {
    // Setup test user
    const mockCognitoToken = {
      sub: 'test-user-stripe-integration',
      email: 'stripe.test@example.com',
      first_name: 'Stripe',
      last_name: 'Test',
      'cognito:username': 'stripetest',
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
      companyName: 'Stripe Test Company',
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

  describe('Payment Intent Creation', () => {
    test('should create valid PaymentIntent with correct amount and currency', async () => {
      const response = await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId })
        .expect(200);

      expect(response.body).toMatchObject({
        clientSecret: expect.stringMatching(/^pi_.*_secret_.*$/),
        paymentIntentId: expect.stringMatching(/^pi_.*$/),
        amount: 750000, // £7,500 in pence (GBP uses pence as smallest unit)
        currency: 'gbp'
      });

      paymentIntentId = response.body.paymentIntentId;
      clientSecret = response.body.clientSecret;

      // Verify PaymentIntent was created in Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      expect(paymentIntent).toMatchObject({
        id: paymentIntentId,
        amount: 750000,
        currency: 'gbp',
        status: 'requires_payment_method',
        metadata: {
          assessmentId: assessmentId,
          userId: userId
        }
      });
    });

    test('should validate payment intent amount matches assessment price', async () => {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      expect(paymentIntent.amount).toBe(750000); // £7,500.00 in pence
      expect(paymentIntent.currency).toBe('gbp');
    });

    test('should store payment intent metadata correctly', async () => {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      expect(paymentIntent.metadata).toMatchObject({
        assessmentId: assessmentId,
        userId: userId
      });
    });

    test('should reject duplicate payment intent creation for same assessment', async () => {
      const response = await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Payment intent already exists')
      });
    });
  });

  describe('Stripe Webhook Validation', () => {
    test('should process payment_intent.succeeded webhook correctly', async () => {
      // Simulate successful payment by updating the PaymentIntent
      await stripe.paymentIntents.update(paymentIntentId, {
        payment_method: 'pm_card_visa', // Test payment method
      });

      const webhookPayload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            status: 'succeeded',
            amount: 750000,
            currency: 'gbp',
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

      expect(response.body).toMatchObject({
        received: true
      });

      // Verify assessment status was updated
      const assessment = await storage.getAssessment(assessmentId);
      expect(assessment.status).toBe('paid');
      expect(assessment.paidAt).toBeTruthy();
      expect(assessment.stripePaymentIntentId).toBe(paymentIntentId);
    });

    test('should handle payment_intent.payment_failed webhook', async () => {
      // Create another test assessment for failure scenario
      const failureResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken);

      const failureAssessmentId = failureResponse.body.id;

      const paymentIntentResponse = await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId: failureAssessmentId });

      const failurePaymentIntentId = paymentIntentResponse.body.paymentIntentId;

      const webhookPayload = {
        id: 'evt_test_webhook_failure',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: failurePaymentIntentId,
            status: 'payment_failed',
            last_payment_error: {
              message: 'Your card was declined.',
              type: 'card_error'
            },
            metadata: {
              assessmentId: failureAssessmentId,
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

      expect(response.body).toMatchObject({
        received: true
      });

      // Verify assessment status remains pending and error is logged
      const assessment = await storage.getAssessment(failureAssessmentId);
      expect(assessment.status).toBe('pending');
      expect(assessment.paidAt).toBeNull();

      // Cleanup
      await storage.deleteAssessment(failureAssessmentId);
    });

    test('should validate webhook signature in production', async () => {
      const invalidWebhookPayload = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_invalid' } }
      };

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send(invalidWebhookPayload)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Invalid signature')
      });
    });
  });

  describe('Payment Flow Error Handling', () => {
    test('should handle insufficient funds scenario', async () => {
      // Create assessment for insufficient funds test
      const response = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken);

      const testAssessmentId = response.body.id;

      const paymentResponse = await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId: testAssessmentId });

      const testPaymentIntentId = paymentResponse.body.paymentIntentId;

      // Simulate card declined webhook
      const webhookPayload = {
        id: 'evt_test_insufficient_funds',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: testPaymentIntentId,
            status: 'requires_payment_method',
            last_payment_error: {
              code: 'insufficient_funds',
              message: 'Your card has insufficient funds.',
              type: 'card_error'
            },
            metadata: {
              assessmentId: testAssessmentId,
              userId: userId
            }
          }
        },
        created: Math.floor(Date.now() / 1000)
      };

      const webhookResponse = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock-signature')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body.received).toBe(true);

      // Cleanup
      await storage.deleteAssessment(testAssessmentId);
    });

    test('should handle payment method authentication required', async () => {
      const authResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken);

      const authAssessmentId = authResponse.body.id;

      const paymentResponse = await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId: authAssessmentId });

      const authPaymentIntentId = paymentResponse.body.paymentIntentId;

      const webhookPayload = {
        id: 'evt_test_auth_required',
        object: 'event',
        type: 'payment_intent.requires_action',
        data: {
          object: {
            id: authPaymentIntentId,
            status: 'requires_action',
            next_action: {
              type: 'use_stripe_sdk'
            },
            metadata: {
              assessmentId: authAssessmentId,
              userId: userId
            }
          }
        },
        created: Math.floor(Date.now() / 1000)
      };

      const webhookResponse = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock-signature')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body.received).toBe(true);

      // Cleanup
      await storage.deleteAssessment(authAssessmentId);
    });
  });

  describe('Production Payment Validation', () => {
    test('should validate Stripe API key configuration', () => {
      expect(process.env.STRIPE_SECRET_KEY).toBeTruthy();
      expect(process.env.STRIPE_SECRET_KEY).toMatch(/^sk_(live|test)_/);
    });

    test('should validate webhook endpoint secret configuration', () => {
      expect(process.env.STRIPE_WEBHOOK_SECRET).toBeTruthy();
      expect(process.env.STRIPE_WEBHOOK_SECRET).toMatch(/^whsec_/);
    });

    test('should create payment intents with proper idempotency', async () => {
      const idempotencyKey = `assess_${assessmentId}_${Date.now()}`;

      // Create PaymentIntent directly with Stripe to verify idempotency
      const paymentIntent1 = await stripe.paymentIntents.create({
        amount: 750000,
        currency: 'gbp',
        metadata: {
          assessmentId: assessmentId,
          userId: userId
        }
      }, {
        idempotencyKey: idempotencyKey
      });

      // Try to create the same PaymentIntent with same idempotency key
      const paymentIntent2 = await stripe.paymentIntents.create({
        amount: 750000,
        currency: 'gbp',
        metadata: {
          assessmentId: assessmentId,
          userId: userId
        }
      }, {
        idempotencyKey: idempotencyKey
      });

      // Should return the same PaymentIntent
      expect(paymentIntent1.id).toBe(paymentIntent2.id);
    });

    test('should handle currency conversion correctly for GBP', async () => {
      // Verify that amounts are correctly converted to pence for GBP
      const response = await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId });

      expect(response.body.amount).toBe(750000); // £7,500 * 100 pence

      const paymentIntent = await stripe.paymentIntents.retrieve(response.body.paymentIntentId);
      expect(paymentIntent.amount).toBe(750000);
      expect(paymentIntent.currency).toBe('gbp');
    });
  });

  describe('Payment Security Validation', () => {
    test('should validate payment intent belongs to authenticated user', async () => {
      // Try to access payment intent from different user
      const otherUserToken = 'Bearer other-user-token';

      jest.spyOn(require('../../server/cognitoAuth'), 'isAuthenticated')
        .mockImplementationOnce((req: any, res: any, next: any) => {
          req.user = {
            claims: {
              sub: 'different-user-id',
              email: 'other@example.com'
            }
          };
          next();
        });

      const response = await request(app)
        .get(`/api/payment-intent/${paymentIntentId}`)
        .set('Authorization', otherUserToken)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Unauthorized access to payment intent'
      });
    });

    test('should prevent payment intent creation for non-existent assessment', async () => {
      const response = await request(app)
        .post('/api/create-payment-intent')
        .set('Authorization', authToken)
        .send({ assessmentId: 'non-existent-assessment-id' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Assessment not found'
      });
    });

    test('should validate assessment belongs to authenticated user', async () => {
      // Create assessment with one user
      const userAssessment = await request(app)
        .post('/api/assessments')
        .set('Authorization', authToken);

      // Try to create payment intent with different user
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
        .post('/api/create-payment-intent')
        .set('Authorization', otherUserToken)
        .send({ assessmentId: userAssessment.body.id })
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Unauthorized access to assessment'
      });

      // Cleanup
      await storage.deleteAssessment(userAssessment.body.id);
    });
  });
});