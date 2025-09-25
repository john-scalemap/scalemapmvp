import request from 'supertest';
import express from 'express';
import { registerRoutes } from './routes';
import { pool } from './db';

jest.mock('./db');
jest.mock('./s3Storage');

describe('Health Check Endpoint', () => {
  let app: express.Express;

  beforeEach(async () => {
    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 OK when all services are healthy', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      services: {
        db: 'up',
        s3: 'up',
        cognito: 'up',
      },
    });
  });

  it('should return 503 Service Unavailable when database is down', async () => {
    (pool.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      timestamp: expect.any(String),
      services: {
        db: 'down',
        s3: 'up',
        cognito: 'up',
      },
    });
  });

  it('should include valid ISO 8601 timestamp', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.toISOString()).toBe(response.body.timestamp);
  });
});