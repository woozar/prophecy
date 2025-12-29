import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CreatorStats } from '@/lib/statistics/types';

import { CreatorLeaderboard } from './CreatorLeaderboard';

const createMockCreatorStats = (overrides: Partial<CreatorStats> = {}): CreatorStats => ({
  userId: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: null,
  totalProphecies: 10,
  acceptedProphecies: 8,
  acceptedPercentage: 80,
  fulfilledProphecies: 5,
  fulfilledPercentage: 63,
  totalScore: 3.5,
  maxPossibleScore: 7.0,
  scorePercentage: 50,
  ...overrides,
});

describe('CreatorLeaderboard', () => {
  it('renders empty state when no stats provided', () => {
    render(<CreatorLeaderboard stats={[]} />);

    expect(screen.getByText('Propheten-Ranking')).toBeInTheDocument();
    expect(
      screen.getByText('Keine Propheten mit akzeptierten Prophezeiungen.')
    ).toBeInTheDocument();
  });

  it('renders creator stats correctly', () => {
    const stats = [
      createMockCreatorStats({ userId: 'user-1', displayName: 'Prophet One', totalScore: 5.0 }),
      createMockCreatorStats({ userId: 'user-2', displayName: 'Prophet Two', totalScore: 3.5 }),
    ];

    render(<CreatorLeaderboard stats={stats} />);

    expect(screen.getByText('Propheten-Ranking')).toBeInTheDocument();
    expect(screen.getByText('Prophet One')).toBeInTheDocument();
    expect(screen.getByText('Prophet Two')).toBeInTheDocument();
  });

  it('displays fulfilled prophecies count correctly', () => {
    const stats = [
      createMockCreatorStats({
        fulfilledProphecies: 5,
        acceptedProphecies: 8,
      }),
    ];

    render(<CreatorLeaderboard stats={stats} />);

    expect(screen.getByText('5/8 erfüllt')).toBeInTheDocument();
    expect(screen.getByText('(63%)')).toBeInTheDocument();
  });

  it('displays score with max possible score', () => {
    const stats = [
      createMockCreatorStats({
        totalScore: 3.5,
        maxPossibleScore: 7.0,
        scorePercentage: 50,
      }),
    ];

    render(<CreatorLeaderboard stats={stats} />);

    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(screen.getByText('/7.0')).toBeInTheDocument();
    expect(screen.getByText('(50%)')).toBeInTheDocument();
  });

  it('shows rank numbers for each creator', () => {
    const stats = [
      createMockCreatorStats({ userId: 'user-1', totalScore: 5.0 }),
      createMockCreatorStats({ userId: 'user-2', totalScore: 3.5 }),
      createMockCreatorStats({ userId: 'user-3', totalScore: 2.0 }),
    ];

    render(<CreatorLeaderboard stats={stats} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('uses username as fallback when displayName is null', () => {
    const stats = [
      createMockCreatorStats({
        username: 'prophet_username',
        displayName: null,
      }),
    ];

    render(<CreatorLeaderboard stats={stats} />);

    expect(screen.getByText('prophet_username')).toBeInTheDocument();
  });

  it('renders fourth ranked creator without medal styling', () => {
    const stats = [
      createMockCreatorStats({ userId: 'user-1', totalScore: 10 }),
      createMockCreatorStats({ userId: 'user-2', totalScore: 8 }),
      createMockCreatorStats({ userId: 'user-3', totalScore: 6 }),
      createMockCreatorStats({ userId: 'user-4', totalScore: 4, displayName: 'Fourth Place' }),
    ];

    render(<CreatorLeaderboard stats={stats} />);

    expect(screen.getByText('Fourth Place')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
