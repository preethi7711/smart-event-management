const request = require('supertest');
const { app } = require('../server'); // make sure server exports app without starting immediately
// wait, server.js starts immediately: start() is called at the bottom.
// We need to mock DB or test against a test DB.
// For now, testing the health endpoint doesn't need DB

describe('API Integrations', () => {
  it('should return health status', async () => {
     const res = await request(app).get('/api/health');
     expect(res.statusCode).toBe(200);
     expect(res.body.success).toBe(true);
  });
});
