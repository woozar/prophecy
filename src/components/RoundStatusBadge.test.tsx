import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { RoundStatusBadge, getRoundStatus } from './RoundStatusBadge';

// Mock matchMedia for useReducedMotion hook
beforeAll(() => {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe('getRoundStatus', () => {
  const baseRound = {
    submissionDeadline: '2025-01-15T00:00:00Z',
    ratingDeadline: '2025-02-15T00:00:00Z',
    fulfillmentDate: '2025-03-15T00:00:00Z',
  };

  it('returns submission when now is before submission deadline', () => {
    const now = new Date('2025-01-10T00:00:00Z');
    expect(getRoundStatus(baseRound, now)).toBe('submission');
  });

  it('returns rating when now is between submission and rating deadline', () => {
    const now = new Date('2025-01-20T00:00:00Z');
    expect(getRoundStatus(baseRound, now)).toBe('rating');
  });

  it('returns waiting when now is between rating deadline and fulfillment date', () => {
    const now = new Date('2025-02-20T00:00:00Z');
    expect(getRoundStatus(baseRound, now)).toBe('waiting');
  });

  it('returns closed when now is after fulfillment date', () => {
    const now = new Date('2025-03-20T00:00:00Z');
    expect(getRoundStatus(baseRound, now)).toBe('closed');
  });

  it('handles Date objects for round dates', () => {
    const roundWithDates = {
      submissionDeadline: new Date('2025-01-15T00:00:00Z'),
      ratingDeadline: new Date('2025-02-15T00:00:00Z'),
      fulfillmentDate: new Date('2025-03-15T00:00:00Z'),
    };
    const now = new Date('2025-01-10T00:00:00Z');
    expect(getRoundStatus(roundWithDates, now)).toBe('submission');
  });
});

describe('RoundStatusBadge', () => {
  const now = new Date();
  const future = new Date(now.getTime() + 86400000 * 30);
  const farFuture = new Date(now.getTime() + 86400000 * 60);
  const veryFarFuture = new Date(now.getTime() + 86400000 * 90);
  const past = new Date(now.getTime() - 86400000 * 30);
  const farPast = new Date(now.getTime() - 86400000 * 60);

  const roundSubmissionOpen = {
    submissionDeadline: future.toISOString(),
    ratingDeadline: farFuture.toISOString(),
    fulfillmentDate: veryFarFuture.toISOString(),
  };

  const roundRatingOpen = {
    submissionDeadline: past.toISOString(),
    ratingDeadline: future.toISOString(),
    fulfillmentDate: farFuture.toISOString(),
  };

  const roundWaiting = {
    submissionDeadline: farPast.toISOString(),
    ratingDeadline: past.toISOString(),
    fulfillmentDate: future.toISOString(),
  };

  const roundClosed = {
    submissionDeadline: farPast.toISOString(),
    ratingDeadline: farPast.toISOString(),
    fulfillmentDate: past.toISOString(),
  };

  it('shows compact label for submission open', () => {
    render(<RoundStatusBadge round={roundSubmissionOpen} variant="compact" />);
    expect(screen.getByText('Offen')).toBeInTheDocument();
  });

  it('shows full label for submission open', () => {
    render(<RoundStatusBadge round={roundSubmissionOpen} variant="full" />);
    expect(screen.getByText('Einreichung offen')).toBeInTheDocument();
  });

  it('shows compact label for rating open', () => {
    render(<RoundStatusBadge round={roundRatingOpen} variant="compact" />);
    expect(screen.getByText('Bewertung')).toBeInTheDocument();
  });

  it('shows full label for rating open', () => {
    render(<RoundStatusBadge round={roundRatingOpen} variant="full" />);
    expect(screen.getByText('Bewertung offen')).toBeInTheDocument();
  });

  it('shows label for waiting state', () => {
    render(<RoundStatusBadge round={roundWaiting} variant="compact" />);
    expect(screen.getByText('Läuft')).toBeInTheDocument();
  });

  it('shows label for closed state', () => {
    render(<RoundStatusBadge round={roundClosed} variant="compact" />);
    expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
  });

  it('uses compact variant by default', () => {
    render(<RoundStatusBadge round={roundSubmissionOpen} />);
    expect(screen.getByText('Offen')).toBeInTheDocument();
  });

  it('uses GlowBadge for non-closed states', () => {
    const { container } = render(<RoundStatusBadge round={roundSubmissionOpen} />);
    // GlowBadge has specific classes
    expect(container.querySelector('.text-green-400')).toBeInTheDocument();
  });

  it('uses plain span for closed state', () => {
    const { container } = render(<RoundStatusBadge round={roundClosed} />);
    // Closed state doesn't use GlowBadge - uses plain span
    expect(container.querySelector('.text-green-400')).not.toBeInTheDocument();
    // Check that it's not a GlowBadge (no border-green classes)
    expect(container.querySelector('.border-green-500\\/30')).not.toBeInTheDocument();
  });
});
