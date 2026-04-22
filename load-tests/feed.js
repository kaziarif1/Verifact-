/**
 * Phase 6 — k6 Load Test: Feed (500 concurrent users)
 * Run: k6 run load-tests/feed.js
 */
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m',  target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed:   ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const res = http.get(`${BASE}/api/v1/claims`);
  check(res, {
    'status is 200':  r => r.status === 200,
    'has data array': r => JSON.parse(r.body).data !== undefined,
    'response < 300ms': r => r.timings.duration < 300,
  });
  sleep(Math.random() * 2 + 0.5);
}
