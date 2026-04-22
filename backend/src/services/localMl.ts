type LocalLabel = 'FACT' | 'RUMOR' | 'UNCERTAIN';

const factSignals = [
  'official', 'confirmed', 'evidence', 'study', 'research', 'report',
  'court', 'government', 'verified', 'data', 'statement', 'record',
];

const rumorSignals = [
  'rumor', 'unconfirmed', 'alleged', 'claiming', 'viral', 'leaked',
  'he said', 'she said', 'whatsapp', 'facebook post', 'heard that',
  'breaking?', 'secret', 'exposed',
];

export const classifyClaimLocally = (text: string) => {
  const normalized = text.toLowerCase();
  const factScore = factSignals.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
  const rumorScore = rumorSignals.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);

  if (factScore === rumorScore) {
    return {
      label: 'UNCERTAIN' as LocalLabel,
      confidence: 0.5,
      modelVersion: 'local-heuristic-v1',
    };
  }

  const winningScore = Math.max(factScore, rumorScore);
  const totalScore = factScore + rumorScore || 1;

  return {
    label: (factScore > rumorScore ? 'FACT' : 'RUMOR') as LocalLabel,
    confidence: Math.min(0.92, 0.55 + winningScore / (totalScore * 2)),
    modelVersion: 'local-heuristic-v1',
  };
};
