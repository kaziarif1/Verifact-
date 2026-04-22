import { describe, it, expect } from 'vitest';
import { trustColor, clampScore, mlLabelColor, formatDate } from '../utils/format';

describe('trustColor', () => {
  it('returns gold for score >= 90', () => {
    expect(trustColor(95)).toBe('#EAB308');
    expect(trustColor(90)).toBe('#EAB308');
  });
  it('returns green for score 75-89', () => {
    expect(trustColor(80)).toBe('#16A34A');
  });
  it('returns blue for score 50-74', () => {
    expect(trustColor(60)).toBe('#3B82F6');
  });
  it('returns orange for score 30-49', () => {
    expect(trustColor(40)).toBe('#F97316');
  });
  it('returns red for score < 30', () => {
    expect(trustColor(20)).toBe('#EF4444');
    expect(trustColor(0)).toBe('#EF4444');
  });
});

describe('clampScore', () => {
  it('clamps at 100', () => { expect(clampScore(150)).toBe(100); });
  it('clamps at 0', () => { expect(clampScore(-5)).toBe(0); });
  it('rounds to 1dp', () => { expect(clampScore(72.45)).toBe(72.5); });
  it('returns value in range unchanged', () => { expect(clampScore(65)).toBe(65); });
});

describe('mlLabelColor', () => {
  it('returns green for FACT', () => {
    expect(mlLabelColor('FACT')).toContain('emerald');
  });
  it('returns red for RUMOR', () => {
    expect(mlLabelColor('RUMOR')).toContain('red');
  });
  it('returns amber for UNCERTAIN', () => {
    expect(mlLabelColor('UNCERTAIN')).toContain('amber');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2024-01-15T10:00:00Z');
    expect(result).toBe('Jan 15, 2024');
  });
  it('returns — for invalid date', () => {
    expect(formatDate('invalid')).toBe('—');
  });
});
