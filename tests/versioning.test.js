const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');

setupTestDB();

describe('API Versioning Route Tests (/api/v1)', () => {
  it('should successfully reach health endpoint on versioned /api/v1/health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should reach auth endpoints under /api/v1/auth', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    // Should hit the validator and return 400 VALIDATION_ERROR
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should reach user endpoints under /api/v1/users', async () => {
    const res = await request(app).get('/api/v1/users');
    // Unauthenticated should return 401 UNAUTHORIZED
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('should also maintain fallback access on /api/health for backwards-compatibility', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
