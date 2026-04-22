import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../components/ui/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Fact</Badge>);
    expect(screen.getByText('Fact')).toBeInTheDocument();
  });

  it('applies fact variant class', () => {
    const { container } = render(<Badge variant="fact">Fact</Badge>);
    expect(container.firstChild).toHaveClass('bg-green-100');
  });

  it('applies rumor variant class', () => {
    const { container } = render(<Badge variant="rumor">Rumor</Badge>);
    expect(container.firstChild).toHaveClass('bg-red-100');
  });

  it('applies default variant when no variant given', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-slate-100');
  });
});
