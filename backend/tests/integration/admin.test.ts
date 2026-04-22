/**
 * Phase 6 — Admin Integration Tests
 */
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/modules/users/user.model';
import { Claim } from '../../src/modules/claims/claim.model';

let mongod: MongoMemoryServer;
let adminToken: string;
let userToken: string;
let claimId: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.NODE_ENV = 'test';

  // Create regular user
  const r = await request(app).post('/api/v1/auth/register').send({ email: 'user@test.com', username: 'reguser', displayName: 'Regular', password: 'Pass1234!' });
  userToken = r.body.data.accessToken;

  // Promote to admin directly
  await User.findByIdAndUpdate(r.body.data.user._id, { role: 'admin' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'user@test.com', password: 'Pass1234!' });
  adminToken = login.body.data.accessToken;

  // Create a claim to review
  const c = await request(app).post('/api/v1/claims').set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Claim for admin review testing purposes', category: 'politics' });
  claimId = c.body.data._id;
});

afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

describe('GET /api/v1/admin/dashboard', () => {
  it('returns stats for admin', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalUsers).toBeDefined();
    expect(res.body.data.totalClaims).toBeDefined();
  });

  it('forbids non-admin users', async () => {
    const r = await request(app).post('/api/v1/auth/register').send({ email: 'plain@test.com', username: 'plainuser', displayName: 'Plain', password: 'Pass1234!' });
    const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${r.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/admin/claims/:id/verdict', () => {
  it('sets Fact verdict', async () => {
    const res = await request(app).patch(`/api/v1/admin/claims/${claimId}/verdict`)
      .set('Authorization', `Bearer ${adminToken}`).send({ decision: 'Fact' });
    expect(res.status).toBe(200);
    expect(res.body.data.finalVerdict).toBe('Fact');
  });

  it('sets Rumor verdict', async () => {
    const res = await request(app).patch(`/api/v1/admin/claims/${claimId}/verdict`)
      .set('Authorization', `Bearer ${adminToken}`).send({ decision: 'Rumor' });
    expect(res.status).toBe(200);
    expect(res.body.data.finalVerdict).toBe('Rumor');
  });

  it('rejects invalid decision', async () => {
    const res = await request(app).patch(`/api/v1/admin/claims/${claimId}/verdict`)
      .set('Authorization', `Bearer ${adminToken}`).send({ decision: 'Maybe' });
    expect(res.status).toBe(400);
  });
});
