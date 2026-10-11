// Optional integration test against a REAL MongoDB.
// It runs only when TEST_MONGODB_URI is set (GitHub Actions sets it using a throw-away
// MongoDB service container). On your laptop it is skipped, so no database is required.
process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const uri = process.env.TEST_MONGODB_URI;
const skip = uri ? false : 'TEST_MONGODB_URI is not set - skipping real-database tests';

// Safety guard: never run destructive tests against a database that is not clearly a test DB.
if (uri && !/test/i.test(uri)) {
  throw new Error('Refusing to run: TEST_MONGODB_URI must contain the word "test" (use a dedicated test database).');
}

const student = { fullName: 'Integration User', rollNumber: 'it-001', email: 'it@example.com', course: 'B.Tech CSE', semester: 3 };
let app;
let Student;
let database;

before(async () => {
  if (skip) return;
  database = require('../src/config/database');
  Student = require('../src/models/Student');
  await database.connectDatabase(uri);
  await Student.deleteMany({});
  await Student.init(); // make sure the unique index exists before testing it
  app = require('../src/app').createApp();
});

after(async () => {
  if (skip) return;
  await Student.deleteMany({});
  await database.disconnectDatabase();
});

test('real MongoDB: create, search, update, duplicate, delete', { skip }, async () => {
  const health = await request(app).get('/health');
  assert.equal(health.status, 200);

  const created = await request(app).post('/api/students').send(student);
  assert.equal(created.status, 201);
  const id = created.body.data.id;

  const dup = await request(app).post('/api/students').send({ ...student, email: 'x@example.com' });
  assert.equal(dup.status, 409); // enforced by the real unique index

  const found = await request(app).get('/api/students').query({ search: 'IT-0' });
  assert.equal(found.body.data.length, 1);

  const updated = await request(app).put(`/api/students/${id}`).send({ ...student, semester: 4 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.semester, 4);

  assert.equal((await request(app).delete(`/api/students/${id}`)).status, 200);
  assert.equal((await request(app).get(`/api/students/${id}`)).status, 404);
});
