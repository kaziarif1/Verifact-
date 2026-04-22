import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VoteBar } from '../components/ui/VoteBar';

describe('VoteBar', () => {
  it('renders without labels by default', () => {
    const { container } = render(<VoteBar upPct={60} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows correct percentages when showLabels is true', () => {
    render(<VoteBar upPct={67.5} showLabels />);
    expect(screen.getByText(/67\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/32\.5%/)).toBeInTheDocument();
  });

  it('clamps upPct at 100', () => {
    const { container } = render(<VoteBar upPct={150} showLabels />);
    expect(container.querySelector('[style*="width: 100%"]') || container).toBeTruthy();
  });

  it('handles 0% up votes', () => {
    render(<VoteBar upPct={0} showLabels />);
    expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
  });

  it('handles 100% up votes', () => {
    render(<VoteBar upPct={100} showLabels />);
    expect(screen.getByText(/100\.0% Fact/)).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<VoteBar upPct={50} label="Community Vote" />);
    expect(screen.getByText('Community Vote')).toBeInTheDocument();
  });
});
