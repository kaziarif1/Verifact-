/**
 * Verifact Trending Score Algorithm
 * ─────────────────────────────────────────────────────────────────
 * Time-decay formula inspired by Hacker News ranking.
 *
 * trendingScore = (V^0.8) / (T + 2)^1.5
 *   V = total votes (engagement signal)
 *   T = hours since creation (time decay)
 */

export const calculateTrendingScore = (totalVotes: number, createdAt: Date): number => {
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const score = Math.pow(totalVotes + 1, 0.8) / Math.pow(ageHours + 2, 1.5);
  return Math.round(score * 10000) / 10000;
};

/**
 * Controversy score — how split is the community?
 * 0 = consensus, 100 = perfectly split.
 * Useful for "Most Debated" sorting.
 */
export const calculateControversyScore = (upvotePct: number): number => {
  return Math.abs(upvotePct - 50) * 2;
};
