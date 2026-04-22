/**
 * Phase 6 — Trust Score Unit Tests (80%+ coverage target)
 */
import { calculateTrustScore, calculateWeightedVotes } from './trustScore';

describe('calculateTrustScore', () => {
  it('returns 50 for new user with no votes', () => {
    const r = calculateTrustScore({ correctVotes: 0, incorrectVotes: 0 });
    expect(r.score).toBe(50);
    expect(r.totalResolved).toBe(0);
    expect(r.isVerificationCandidate).toBe(false);
  });

  it('starts above 50 after first correct vote', () => {
    const r = calculateTrustScore({ correctVotes: 1, incorrectVotes: 0 });
    expect(r.score).toBeGreaterThan(50);
  });

  it('starts below 50 after first incorrect vote', () => {
    const r = calculateTrustScore({ correctVotes: 0, incorrectVotes: 1 });
    expect(r.score).toBeLessThan(50);
  });

  it('score stays at 50 for equal correct/incorrect', () => {
    const r = calculateTrustScore({ correctVotes: 50, incorrectVotes: 50 });
    expect(r.score).toBe(50);
  });

  it('score approaches 100 for perfect accuracy with many votes', () => {
    const r = calculateTrustScore({ correctVotes: 200, incorrectVotes: 0 });
    expect(r.score).toBeGreaterThan(90);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('score approaches 0 for zero accuracy with many votes', () => {
    const r = calculateTrustScore({ correctVotes: 0, incorrectVotes: 200 });
    expect(r.score).toBeLessThan(10);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it('marks verification candidate when score >= 75 AND votes >= 20', () => {
    const r = calculateTrustScore({ correctVotes: 50, incorrectVotes: 5 });
    expect(r.isVerificationCandidate).toBe(true);
  });

  it('does NOT mark candidate when votes < 20 even with perfect score', () => {
    const r = calculateTrustScore({ correctVotes: 10, incorrectVotes: 0 });
    expect(r.isVerificationCandidate).toBe(false);
  });

  it('does NOT mark candidate when score < 75 even with many votes', () => {
    const r = calculateTrustScore({ correctVotes: 20, incorrectVotes: 20 });
    expect(r.isVerificationCandidate).toBe(false);
  });

  it('clamps score between 0 and 100', () => {
    const high = calculateTrustScore({ correctVotes: 10000, incorrectVotes: 0 });
    const low  = calculateTrustScore({ correctVotes: 0, incorrectVotes: 10000 });
    expect(high.score).toBeLessThanOrEqual(100);
    expect(low.score).toBeGreaterThanOrEqual(0);
  });

  it('applies Bayesian smoothing — 5 votes should not give score near 100', () => {
    const r = calculateTrustScore({ correctVotes: 5, incorrectVotes: 0 });
    expect(r.score).toBeLessThan(75);
  });

  it('returns correct accuracy and weight values', () => {
    const r = calculateTrustScore({ correctVotes: 20, incorrectVotes: 5 });
    expect(r.accuracy).toBeCloseTo(0.8, 2);
    expect(r.weight).toBeCloseTo(25 / (25 + 20), 3);
  });
});

describe('calculateWeightedVotes', () => {
  it('returns 50 for empty votes array', () => {
    const r = calculateWeightedVotes([]);
    expect(r.weightedUpPct).toBe(50);
    expect(r.weightedTotal).toBe(0);
  });

  it('returns 100 when all votes are up', () => {
    const r = calculateWeightedVotes([
      { direction: 'up', trustScore: 80 },
      { direction: 'up', trustScore: 60 },
    ]);
    expect(r.weightedUpPct).toBe(100);
  });

  it('returns 0 when all votes are down', () => {
    const r = calculateWeightedVotes([
      { direction: 'down', trustScore: 80 },
      { direction: 'down', trustScore: 60 },
    ]);
    expect(r.weightedUpPct).toBe(0);
  });

  it('weights high-trust votes more than low-trust votes', () => {
    const highTrustUp = calculateWeightedVotes([
      { direction: 'up',   trustScore: 90 },
      { direction: 'down', trustScore: 10 },
    ]);
    const equalVotes = calculateWeightedVotes([
      { direction: 'up',   trustScore: 50 },
      { direction: 'down', trustScore: 50 },
    ]);
    expect(highTrustUp.weightedUpPct).toBeGreaterThan(equalVotes.weightedUpPct);
  });

  it('computes weighted total correctly', () => {
    const r = calculateWeightedVotes([
      { direction: 'up', trustScore: 70 },
      { direction: 'down', trustScore: 30 },
    ]);
    expect(r.weightedTotal).toBe(100);
    expect(r.weightedUpPct).toBeCloseTo(70, 1);
  });
});
