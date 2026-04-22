/**
 * Verifact Trust Score Algorithm
 * ─────────────────────────────────────────────────────────────────
 * Bayesian-smoothed accuracy score ranging from 0–100.
 * Based on same principle as IMDb Bayesian ratings and Wilson score.
 *
 * Formula:
 *   accuracy        = C / T  (or 0.5 if T = 0)
 *   weight          = T / (T + K)   where K = 20
 *   weightedAccuracy = (accuracy × weight) + (0.5 × (1 - weight))
 *   trustScore      = clamp(weightedAccuracy × 100, 0, 100)
 */

const SMOOTHING_CONSTANT = 20; // K — equivalent to 20 "neutral" prior votes
const VERIFICATION_THRESHOLD = 75;
const VERIFICATION_MIN_VOTES = 20;

export interface TrustScoreInput {
  correctVotes: number;
  incorrectVotes: number;
}

export interface TrustScoreResult {
  score: number;
  accuracy: number;
  weight: number;
  totalResolved: number;
  isVerificationCandidate: boolean;
}

export const calculateTrustScore = (input: TrustScoreInput): TrustScoreResult => {
  const { correctVotes: C, incorrectVotes: I } = input;
  const T = C + I; // total resolved votes

  // Step 1: Raw accuracy rate
  const accuracy = T > 0 ? C / T : 0.5;

  // Step 2: Confidence weight (Bayesian smoothing)
  const weight = T / (T + SMOOTHING_CONSTANT);

  // Step 3: Weighted accuracy (blend with neutral prior of 0.5)
  const weightedAccuracy = accuracy * weight + 0.5 * (1 - weight);

  // Step 4: Scale to 0–100 and clamp
  const score = Math.min(100, Math.max(0, Math.round(weightedAccuracy * 100 * 100) / 100));

  const isVerificationCandidate = score >= VERIFICATION_THRESHOLD && T >= VERIFICATION_MIN_VOTES;

  return { score, accuracy, weight, totalResolved: T, isVerificationCandidate };
};

/**
 * Compute the weighted community vote score for a claim.
 * Each vote is weighted by the voter's current trust score.
 */
export interface WeightedVoteInput {
  direction: 'up' | 'down';
  trustScore: number;
}

export interface WeightedVoteResult {
  weightedUpScore: number;
  weightedDownScore: number;
  weightedTotal: number;
  weightedUpPct: number;
}

export const calculateWeightedVotes = (votes: WeightedVoteInput[]): WeightedVoteResult => {
  let weightedUpScore = 0;
  let weightedDownScore = 0;

  for (const vote of votes) {
    if (vote.direction === 'up') {
      weightedUpScore += vote.trustScore;
    } else {
      weightedDownScore += vote.trustScore;
    }
  }

  const weightedTotal = weightedUpScore + weightedDownScore;
  const weightedUpPct = weightedTotal > 0 ? (weightedUpScore / weightedTotal) * 100 : 50;

  return { weightedUpScore, weightedDownScore, weightedTotal, weightedUpPct };
};
