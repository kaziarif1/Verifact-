/**
 * Phase 6 — Voting Integration Tests
 */
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/modules/users/user.model';
import { Claim } from '../../src/modules/claims/claim.model';
import { Vote } from '../../src/modules/votes/vote.model';

let mongod: MongoMemoryServer;
let token1: string, token2: string;
let claimId: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.NODE_ENV = 'test';

  const r1 = await request(app).post('/api/v1/auth/register').send({ email: 'v1@test.com', username: 'voter1', displayName: 'Voter 1', password: 'Pass1234!' });
  const r2 = await request(app).post('/api/v1/auth/register').send({ email: 'v2@test.com', username: 'voter2', displayName: 'Voter 2', password: 'Pass1234!' });
  token1 = r1.body.data.accessToken;
  token2 = r2.body.data.accessToken;

  const claim = await request(app).post('/api/v1/claims')
    .set('Authorization', `Bearer ${token1}`)
    .send({ title: 'A valid claim title for testing votes', category: 'science' });
  claimId = claim.body.data._id;
});

afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
afterEach(async () => { await Vote.deleteMany({}); });

describe('POST /api/v1/claims/:id/vote', () => {
  it('casts a vote successfully', async () => {
    const res = await request(app).post(`/api/v1/claims/${claimId}/vote`)
      .set('Authorization', `Bearer ${token2}`).send({ direction: 'up' });
    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('cast');
  });

  it('removes vote when voting same direction twice (toggle)', async () => {
    await request(app).post(`/api/v1/claims/${claimId}/vote`).set('Authorization', `Bearer ${token2}`).send({ direction: 'up' });
    const res = await request(app).post(`/api/v1/claims/${claimId}/vote`).set('Authorization', `Bearer ${token2}`).send({ direction: 'up' });
    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('removed');
  });

  it('changes vote direction', async () => {
    await request(app).post(`/api/v1/claims/${claimId}/vote`).set('Authorization', `Bearer ${token2}`).send({ direction: 'up' });
    const res = await request(app).post(`/api/v1/claims/${claimId}/vote`).set('Authorization', `Bearer ${token2}`).send({ direction: 'down' });
    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('updated');
    expect(res.body.data.direction).toBe('down');
  });

  it('forbids voting on own claim with 403', async () => {
    const res = await request(app).post(`/api/v1/claims/${claimId}/vote`)
      .set('Authorization', `Bearer ${token1}`).send({ direction: 'up' });
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app).post(`/api/v1/claims/${claimId}/vote`).send({ direction: 'up' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid direction', async () => {
    const res = await request(app).post(`/api/v1/claims/${claimId}/vote`)
      .set('Authorization', `Bearer ${token2}`).send({ direction: 'sideways' });
    expect(res.status).toBe(400);
  });
});
