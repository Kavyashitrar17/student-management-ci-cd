process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createFakeRepository } = require('./helpers/fakeRepository');

test('GET /health returns 200 and "ok" when the database is connected', async () => {
  const app = createApp({ studentRepository: createFakeRepository(), dbConnected: () => true });
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database, 'connected');
  assert.equal(typeof res.body.uptimeSeconds, 'number');
});

test('GET /health returns 503 and "degraded" when the database is down', async () => {
  const app = createApp({ studentRepository: createFakeRepository(), dbConnected: () => false });
  const res = await request(app).get('/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.status, 'degraded');
  assert.equal(res.body.database, 'disconnected');
});

test('API routes return 503 (not a hang or crash) while the database is down', async () => {
  const app = createApp({ studentRepository: createFakeRepository(), dbConnected: () => false });
  const res = await request(app).get('/api/students');
  assert.equal(res.status, 503);
  assert.equal(res.body.error.code, 'DATABASE_UNAVAILABLE');
});
