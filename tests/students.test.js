process.env.NODE_ENV = 'test';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createFakeRepository, createFailingRepository } = require('./helpers/fakeRepository');

const validStudent = {
  fullName: 'Asha Verma',
  rollNumber: 'cs2024-01',
  email: 'Asha@Example.com',
  course: 'B.Tech Computer Science',
  semester: 5
};
const MISSING_ID = '64b64c4f1f1f1f1f1f1f1f1f'; // valid format, does not exist

let app;
beforeEach(() => {
  // Fresh in-memory store for every test => repeatable, no shared state.
  app = createApp({ studentRepository: createFakeRepository(), dbConnected: () => true });
});

test('GET /api/students returns an empty list at first', async () => {
  const res = await request(app).get('/api/students');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, []);
  assert.equal(res.body.meta.total, 0);
});

test('POST /api/students adds a valid student (normalises roll number and email)', async () => {
  const res = await request(app).post('/api/students').send(validStudent);
  assert.equal(res.status, 201);
  assert.equal(res.body.data.rollNumber, 'CS2024-01');
  assert.equal(res.body.data.email, 'asha@example.com');
  assert.ok(res.body.data.id);

  const list = await request(app).get('/api/students');
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.meta.total, 1);
});

test('POST /api/students rejects missing fields with field-level details', async () => {
  const res = await request(app).post('/api/students').send({ fullName: 'A' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  const fields = res.body.error.details.map((d) => d.field);
  for (const f of ['fullName', 'rollNumber', 'email', 'course', 'semester']) {
    assert.ok(fields.includes(f), `expected an error for ${f}`);
  }
});

test('POST /api/students rejects a bad email and out-of-range semester', async () => {
  const res = await request(app).post('/api/students').send({ ...validStudent, email: 'not-an-email', semester: 9 });
  assert.equal(res.status, 400);
  const fields = res.body.error.details.map((d) => d.field);
  assert.ok(fields.includes('email'));
  assert.ok(fields.includes('semester'));
});

test('POST /api/students rejects NoSQL-injection style objects', async () => {
  const res = await request(app).post('/api/students').send({ ...validStudent, rollNumber: { $ne: '' } });
  assert.equal(res.status, 400);
});

test('POST /api/students rejects malformed JSON with 400', async () => {
  const res = await request(app).post('/api/students').set('Content-Type', 'application/json').send('{bad json');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_JSON');
});

test('POST /api/students rejects a duplicate roll number (case-insensitive) with 409', async () => {
  await request(app).post('/api/students').send(validStudent);
  const res = await request(app).post('/api/students').send({ ...validStudent, email: 'other@example.com', rollNumber: 'CS2024-01' });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'DUPLICATE_ROLL_NUMBER');
});

test('GET /api/students?search= finds by name or roll number and rejects object queries', async () => {
  await request(app).post('/api/students').send(validStudent);
  await request(app).post('/api/students').send({ ...validStudent, fullName: 'Rohan Mehta', rollNumber: 'CS2024-02', email: 'r@example.com' });

  const byName = await request(app).get('/api/students').query({ search: 'rohan' });
  assert.equal(byName.body.data.length, 1);
  assert.equal(byName.body.data[0].fullName, 'Rohan Mehta');
  assert.equal(byName.body.meta.total, 2); // total ignores the search filter

  const byRoll = await request(app).get('/api/students').query({ search: 'cs2024-01' });
  assert.equal(byRoll.body.data.length, 1);

  // Repeated parameter => array => rejected. Bracket syntax is NOT parsed into an operator object
  // by Express 5's default query parser, so it is just an unknown key and cannot reach MongoDB.
  const repeated = await request(app).get('/api/students?search=a&search=b');
  assert.equal(repeated.status, 400);
  const bracket = await request(app).get('/api/students?search[$ne]=x');
  assert.equal(bracket.status, 200);
  assert.equal(bracket.body.data.length, 2);
});

test('GET /api/students/:id returns one student, 404 when missing, 400 for a bad id', async () => {
  const created = await request(app).post('/api/students').send(validStudent);
  const ok = await request(app).get(`/api/students/${created.body.data.id}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.fullName, 'Asha Verma');

  assert.equal((await request(app).get(`/api/students/${MISSING_ID}`)).status, 404);
  assert.equal((await request(app).get('/api/students/not-an-id')).status, 400);
});

test('PUT /api/students/:id updates an existing student', async () => {
  const created = await request(app).post('/api/students').send(validStudent);
  const res = await request(app)
    .put(`/api/students/${created.body.data.id}`)
    .send({ ...validStudent, fullName: 'Asha V. Sharma', semester: 6 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.fullName, 'Asha V. Sharma');
  assert.equal(res.body.data.semester, 6);
});

test('PUT /api/students/:id returns 404 for a missing student and 409 for a duplicate roll number', async () => {
  const missing = await request(app).put(`/api/students/${MISSING_ID}`).send(validStudent);
  assert.equal(missing.status, 404);

  await request(app).post('/api/students').send(validStudent);
  const second = await request(app).post('/api/students').send({ ...validStudent, rollNumber: 'CS2024-02', email: 'b@example.com' });
  const clash = await request(app).put(`/api/students/${second.body.data.id}`).send(validStudent);
  assert.equal(clash.status, 409);
});

test('DELETE /api/students/:id deletes a student; a second delete returns 404', async () => {
  const created = await request(app).post('/api/students').send(validStudent);
  const id = created.body.data.id;
  assert.equal((await request(app).delete(`/api/students/${id}`)).status, 200);
  assert.equal((await request(app).get(`/api/students/${id}`)).status, 404);
  assert.equal((await request(app).delete(`/api/students/${id}`)).status, 404);
});

test('unexpected database errors return a generic 500 and leak no internals', async () => {
  const failing = createApp({
    studentRepository: createFailingRepository(new Error('secret connection string mongodb+srv://user:pw@host')),
    dbConnected: () => true
  });
  const res = await request(failing).get('/api/students');
  assert.equal(res.status, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(res.body).includes('mongodb+srv'));
  assert.ok(!JSON.stringify(res.body).includes('stack'));
});

test('a database connection error during a request returns 503', async () => {
  const err = Object.assign(new Error('timed out'), { name: 'MongoServerSelectionError' });
  const failing = createApp({ studentRepository: createFailingRepository(err), dbConnected: () => true });
  const res = await request(failing).post('/api/students').send(validStudent);
  assert.equal(res.status, 503);
  assert.equal(res.body.error.code, 'DATABASE_UNAVAILABLE');
});

test('unknown API routes return a JSON 404', async () => {
  const res = await request(app).get('/api/nothing');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
