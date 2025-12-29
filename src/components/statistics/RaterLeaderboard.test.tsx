import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RaterLeaderboard } from './RaterLeaderboard';
import type { RaterStats } from '@/lib/statistics/types';

const createMockRaterStats = (overrides: Partial<RaterStats> = {}): RaterStats => ({
  userId: 'user-1',
  username: 'testuser',
  displayName: 'Test Rater',
  avatarUrl: null,
  totalRatings: 10,
  correctPoints: 6,
  incorrectPoints: 2,
  netScore: 4,
  maxPossibleScore: 8,
  hitRatePercentage: 50,
  ...overrides,
});

describe('RaterLeaderboard', () => {
  it('renders empty state when no stats provided', () => {
    render(<RaterLeaderboard stats={[]} />);

    expect(screen.getByText('Bewerter-Ranking')).toBeInTheDocument();
    expect(screen.getByText('Keine Bewertungen vorhanden.')).toBeInTheDocument();
  });

  it('renders rater stats correctly', () => {
    const stats = [
      createMockRaterStats({ userId: 'user-1', displayName: 'Rater One', netScore: 5 }),
      createMockRaterStats({ userId: 'user-2', displayName: 'Rater Two', netScore: 3 }),
    ];

    render(<RaterLeaderboard stats={stats} />);

    expect(screen.getByText('Bewerter-Ranking')).toBeInTheDocument();
    expect(screen.getByText('Rater One')).toBeInTheDocument();
    expect(screen.getByText('Rater Two')).toBeInTheDocument();
  });

  it('displays correct and incorrect points', () => {
    const stats = [
      createMockRaterStats({
        correctPoints: 8,
        incorrectPoints: 3,
      }),
    ];

    render(<RaterLeaderboard stats={stats} />);

    expect(screen.getByText('+8')).toBeInTheDocument();
    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('displays hit rate percentage', () => {
    const stats = [
      createMockRaterStats({
        hitRatePercentage: 75,
      }),
    ];

    render(<RaterLeaderboard stats={stats} />);

    expect(screen.getByText('(75% Trefferquote)')).toBeInTheDocument();
  });

  it('displays positive net score with plus sign', () => {
    const stats = [
      createMockRaterStats({
        netScore: 5,
      }),
    ];

    render(<RaterLeaderboard stats={stats} />);

    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('displays negative net score correctly', () => {
    const stats = [
      createMockRaterStats({
        netScore: -3,
      }),
    ];

    render(<RaterLeaderboard stats={stats} />);

    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('shows rank numbers for each rater', () => {
    const stats = [
      createMockRaterStats({ userId: 'user-1', netScore: 5 }),
      createMockRaterStats({ userId: 'user-2', netScore: 3 }),
      createMockRaterStats({ userId: 'user-3', netScore: 1 }),
    ];

    render(<RaterLeaderboard stats={stats} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('uses username as fallback when displayName is null', () => {
    const stats = [
      createMockRaterStats({
        username: 'rater_username',
        displayName: null,
      }),
    ];

    render(<RaterLeaderboard stats={stats} />);

    expect(screen.getByText('rater_username')).toBeInTheDocument();
  });

  it('shows explanation text', () => {
    const stats = [createMockRaterStats()];

    render(<RaterLeaderboard stats={stats} />);

    expect(
      screen.getByText(/Korrekt = Positive Bewertung bei erfüllter Prophezeiung/)
    ).toBeInTheDocument();
  });

  it('renders fourth ranked rater without medal styling', () => {
    const stats = [
      createMockRaterStats({ userId: 'user-1', netScore: 10 }),
      createMockRaterStats({ userId: 'user-2', netScore: 8 }),
      createMockRaterStats({ userId: 'user-3', netScore: 6 }),
      createMockRaterStats({ userId: 'user-4', netScore: 4, displayName: 'Fourth Place' }),
    ];

    render(<RaterLeaderboard stats={stats} />);

    expect(screen.getByText('Fourth Place')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
