/**
 * Phase 6 — k6 Load Test: Voting (100 concurrent users on same claim)
 * Set env vars: CLAIM_ID, AUTH_TOKEN
 * Run: k6 run -e CLAIM_ID=xxx -e AUTH_TOKEN=yyy load-tests/voting.js
 */
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '1m',  target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed:   ['rate<0.05'],
  },
};

const BASE    = __ENV.BASE_URL   || 'http://localhost:5000';
const CLAIM   = __ENV.CLAIM_ID   || 'replace-with-real-claim-id';
const TOKEN   = __ENV.AUTH_TOKEN || 'replace-with-real-token';

export default function () {
  const dir = Math.random() > 0.5 ? 'up' : 'down';
  const res = http.post(
    `${BASE}/api/v1/claims/${CLAIM}/vote`,
    JSON.stringify({ direction: dir }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` } }
  );
  check(res, {
    'vote accepted':    r => [200, 409].includes(r.status),
    'not server error': r => r.status < 500,
  });
  sleep(0.5);
}
