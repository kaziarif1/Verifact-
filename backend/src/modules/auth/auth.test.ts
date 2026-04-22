/**
 * Phase 6 — Auth Module Unit + Integration Tests
 */
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { User } from '../users/user.model';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

const validUser = {
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  password: 'Password123!',
};

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns 201', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('rejects duplicate username with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send({ ...validUser, email: 'other@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_EXISTS');
  });

  it('rejects missing email with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ username: 'u', password: 'pass', displayName: 'D' });
    expect(res.status).toBe(400);
  });

  it('rejects short password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...validUser, password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: validUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('rejects non-existent email with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'anything' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns current user when authenticated', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = reg.body.data.accessToken;
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(validUser.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('logs out and clears refresh cookie', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = reg.body.data.accessToken;
    const res = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});
