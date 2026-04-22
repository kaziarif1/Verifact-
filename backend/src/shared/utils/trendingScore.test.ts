import { calculateTrendingScore } from './trendingScore';

describe('calculateTrendingScore', () => {
  it('returns 0 for 0 votes', () => {
    expect(calculateTrendingScore(0, new Date())).toBe(0);
  });

  it('returns a positive number for votes', () => {
    const score = calculateTrendingScore(100, new Date());
    expect(score).toBeGreaterThan(0);
  });

  it('newer posts score higher than older posts with same votes', () => {
    const now = new Date();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const newScore = calculateTrendingScore(50, now);
    const oldScore = calculateTrendingScore(50, hourAgo);
    expect(newScore).toBeGreaterThan(oldScore);
  });

  it('posts with more votes score higher than fewer votes at same time', () => {
    const now = new Date();
    const high = calculateTrendingScore(1000, now);
    const low  = calculateTrendingScore(10, now);
    expect(high).toBeGreaterThan(low);
  });

  it('score decreases over time', () => {
    const hourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const dayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(calculateTrendingScore(100, hourAgo)).toBeGreaterThan(calculateTrendingScore(100, dayAgo));
  });
});
