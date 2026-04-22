import { formatDistanceToNow, format } from 'date-fns';

export const timeAgo = (date: string | Date) => {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return 'some time ago'; }
};

export const formatDate = (date: string | Date) => {
  try { return format(new Date(date), 'MMM d, yyyy'); }
  catch { return '—'; }
};

export const trustColor = (score: number): string => {
  if (score >= 90) return '#EAB308';   // gold
  if (score >= 75) return '#16A34A';   // green
  if (score >= 50) return '#3B82F6';   // blue
  if (score >= 30) return '#F97316';   // orange
  return '#EF4444';                    // red
};

export const verdictBg = (v: string): string => {
  if (v === 'Fact') return 'bg-emerald-500';
  if (v === 'Rumor') return 'bg-red-500';
  return 'bg-amber-400';
};

export const mlLabelColor = (label: string): string => {
  if (label === 'FACT') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (label === 'RUMOR') return 'text-red-700 bg-red-50 border-red-200';
  return 'text-amber-700 bg-amber-50 border-amber-200';
};

export const clampScore = (n: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, Math.round(n * 10) / 10));
