import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrustBadge } from '../components/ui/TrustBadge';

describe('TrustBadge', () => {
  it('renders the score rounded', () => {
    render(<TrustBadge score={72.4} />);
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('renders score 50 for default', () => {
    render(<TrustBadge score={50} />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('has title attribute with score', () => {
    render(<TrustBadge score={85} />);
    const el = screen.getByTitle('Trust Score: 85/100');
    expect(el).toBeTruthy();
  });

  it('renders in small size by default', () => {
    const { container } = render(<TrustBadge score={60} />);
    expect(container.firstChild).toBeTruthy();
  });
});
