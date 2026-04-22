/**
 * Phase 6 — Claims Integration Tests
 */
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/modules/users/user.model';
import { Claim } from '../../src/modules/claims/claim.model';

let mongod: MongoMemoryServer;
let userToken: string;
let userId: string;

const testUser = { email: 'claim@test.com', username: 'claimuser', displayName: 'Claim User', password: 'Password123!' };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.NODE_ENV = 'test';
  const res = await request(app).post('/api/v1/auth/register').send(testUser);
  userToken = res.body.data.accessToken;
  userId = res.body.data.user._id;
});

afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
afterEach(async () => { await Claim.deleteMany({}); });

const validClaim = { title: 'This is a test claim title that is long enough', category: 'science' };

describe('POST /api/v1/claims', () => {
  it('creates a claim when authenticated', async () => {
    const res = await request(app).post('/api/v1/claims')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validClaim);
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe(validClaim.title);
    expect(res.body.data.mlPrediction.label).toBe('PENDING');
  });

  it('rejects unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/v1/claims').send(validClaim);
    expect(res.status).toBe(401);
  });

  it('rejects title shorter than 10 chars', async () => {
    const res = await request(app).post('/api/v1/claims')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Short', category: 'science' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/claims', () => {
  it('returns feed for guests', async () => {
    const res = await request(app).get('/api/v1/claims');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('filters by category', async () => {
    await request(app).post('/api/v1/claims').set('Authorization', `Bearer ${userToken}`).send({ ...validClaim, category: 'health' });
    const res = await request(app).get('/api/v1/claims?category=health');
    expect(res.status).toBe(200);
    res.body.data.forEach((c: any) => expect(c.category).toBe('health'));
  });
});

describe('GET /api/v1/claims/:id', () => {
  it('returns a single claim', async () => {
    const created = await request(app).post('/api/v1/claims').set('Authorization', `Bearer ${userToken}`).send(validClaim);
    const id = created.body.data._id;
    const res = await request(app).get(`/api/v1/claims/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(id);
  });

  it('returns 404 for non-existent claim', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/v1/claims/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/claims/:id', () => {
  it('soft-deletes own claim', async () => {
    const created = await request(app).post('/api/v1/claims').set('Authorization', `Bearer ${userToken}`).send(validClaim);
    const id = created.body.data._id;
    const res = await request(app).delete(`/api/v1/claims/${id}`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(204);
    const check = await request(app).get(`/api/v1/claims/${id}`);
    expect(check.status).toBe(404);
  });

  it('forbids deleting another user\'s claim', async () => {
    const created = await request(app).post('/api/v1/claims').set('Authorization', `Bearer ${userToken}`).send(validClaim);
    const id = created.body.data._id;
    const other = await request(app).post('/api/v1/auth/register').send({ email: 'other@x.com', username: 'otherx', displayName: 'Other', password: 'Pass1234!' });
    const otherToken = other.body.data.accessToken;
    const res = await request(app).delete(`/api/v1/claims/${id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });
});
