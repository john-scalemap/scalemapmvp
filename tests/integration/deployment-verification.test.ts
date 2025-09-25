import { describe, it, expect } from '@jest/globals';

const ALB_ENDPOINT = process.env.ALB_ENDPOINT || 'http://Scalem-Scale-RRvIVSLk5gxy-832498527.eu-west-1.elb.amazonaws.com';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || 'https://d2nr28qnjfjgb5.cloudfront.net';

describe('Integration Verification - Deployment', () => {
  describe('IV1: End-to-End Infrastructure', () => {
    it('should have healthy API service via ALB', async () => {
      const response = await fetch(`${ALB_ENDPOINT}/api/health`);
      expect(response.status).toBe(200);

      const health = await response.json();
      expect(health.status).toBe('healthy');
      expect(health.services.db).toBe('up');
      expect(health.services.s3).toBe('up');
      expect(health.services.cognito).toBe('up');
    });

    it('should have healthy API service via CloudFront', async () => {
      const response = await fetch(`${CLOUDFRONT_URL}/api/health`);
      expect(response.status).toBe(200);

      const health = await response.json();
      expect(health.status).toBe('healthy');
    });

    it('should serve frontend from CloudFront', async () => {
      const response = await fetch(CLOUDFRONT_URL);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');

      const html = await response.text();
      expect(html).toContain('<div id="root"></div>');
    });
  });

  describe('IV2: Authentication & Security', () => {
    it('should reject requests to protected endpoints without token', async () => {
      const response = await fetch(`${ALB_ENDPOINT}/api/auth/user`);
      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error.message).toBe('No token provided');
    });

    it('should enforce CORS for CloudFront origin', async () => {
      const response = await fetch(`${ALB_ENDPOINT}/api/health`, {
        headers: {
          'Origin': CLOUDFRONT_URL
        }
      });

      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });
  });

  describe('IV3: Performance & Monitoring', () => {
    it('should respond to health checks within 3 seconds', async () => {
      const startTime = Date.now();
      const response = await fetch(`${ALB_ENDPOINT}/api/health`);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should include monitoring headers', async () => {
      const response = await fetch(`${ALB_ENDPOINT}/api/health`);

      expect(response.headers.get('x-powered-by')).toBe('Express');
      expect(response.headers.has('date')).toBe(true);
    });
  });
});