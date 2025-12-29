import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GlowBadge } from './GlowBadge';

describe('GlowBadge', () => {
  it('renders children correctly', () => {
    render(<GlowBadge>Badge Text</GlowBadge>);
    expect(screen.getByText('Badge Text')).toBeInTheDocument();
  });

  it('applies default cyan color classes', () => {
    render(<GlowBadge data-testid="badge">Badge</GlowBadge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('text-cyan-400');
  });

  it('applies small size classes by default', () => {
    render(<GlowBadge data-testid="badge">Badge</GlowBadge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('px-3', 'py-1', 'text-xs');
  });

  it('applies medium size classes when size is md', () => {
    render(
      <GlowBadge size="md" data-testid="badge">
        Badge
      </GlowBadge>
    );
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('px-4', 'py-2', 'text-sm');
  });

  it('does not show dot by default', () => {
    render(<GlowBadge data-testid="badge">Badge</GlowBadge>);
    const badge = screen.getByTestId('badge');
    const dot = badge.querySelector('.animate-pulse');
    expect(dot).not.toBeInTheDocument();
  });

  it('shows pulsing dot when withDot is true', () => {
    render(
      <GlowBadge withDot data-testid="badge">
        Badge
      </GlowBadge>
    );
    const badge = screen.getByTestId('badge');
    const dot = badge.querySelector('.animate-pulse');
    expect(dot).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(
      <GlowBadge className="custom-class" data-testid="badge">
        Badge
      </GlowBadge>
    );
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('custom-class');
    expect(badge).toHaveClass('rounded-full');
  });

  it('applies rounded-full class', () => {
    render(<GlowBadge data-testid="badge">Badge</GlowBadge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('rounded-full');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <GlowBadge data-testid="badge" id="my-badge">
        Badge
      </GlowBadge>
    );
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveAttribute('id', 'my-badge');
  });
});
