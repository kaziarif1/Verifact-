/**
 * Phase 6 — k6 Load Test: ML Service (50 concurrent prediction requests)
 * Set env var: ML_KEY
 * Run: k6 run -e ML_KEY=xxx load-tests/ml_service.js
 */
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '1m',  target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.02'],
  },
};

const ML_BASE = __ENV.ML_URL || 'http://localhost:8000';
const ML_KEY  = __ENV.ML_KEY || '';

const CLAIMS = [
  'Scientists confirm new vaccine is 95% effective against all variants',
  'Viral photo shows giant spider the size of a car found in Amazon',
  'Government announces free housing for all citizens next year',
  'New study finds coffee cures all known diseases instantly',
  'Celebrity spotted on Mars according to unnamed sources',
];

export default function () {
  const text = CLAIMS[Math.floor(Math.random() * CLAIMS.length)];
  const res = http.post(
    `${ML_BASE}/predict`,
    JSON.stringify({ claim_id: `load-test-${Date.now()}`, text }),
    { headers: { 'Content-Type': 'application/json', 'X-Internal-Key': ML_KEY } }
  );
  check(res, {
    'prediction returned':  r => r.status === 200,
    'has label':            r => ['FACT','RUMOR','UNCERTAIN'].includes(JSON.parse(r.body)?.label),
    'response < 2s':        r => r.timings.duration < 2000,
  });
  sleep(1);
}
