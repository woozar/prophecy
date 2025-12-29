import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Round } from '@/store/useRoundStore';

import { RoundResultsClient } from './RoundResultsClient';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockRound = (overrides = {}): Round => ({
  id: 'round-1',
  title: 'Test Runde',
  submissionDeadline: '2025-01-01T00:00:00Z',
  ratingDeadline: '2025-01-15T00:00:00Z',
  fulfillmentDate: '2025-12-31T00:00:00Z',
  resultsPublishedAt: '2025-01-20T00:00:00Z',
  createdAt: '2024-12-01T00:00:00Z',
  ...overrides,
});

const createMockStatistics = (overrides = {}) => ({
  roundId: 'round-1',
  totalAcceptedProphecies: 10,
  resolvedProphecies: 8,
  isComplete: false,
  creatorStats: [
    {
      userId: 'user-1',
      username: 'prophet1',
      displayName: 'Prophet One',
      avatarUrl: null,
      totalProphecies: 5,
      acceptedProphecies: 4,
      acceptedPercentage: 80,
      fulfilledProphecies: 3,
      fulfilledPercentage: 75,
      totalScore: 7.5,
      maxPossibleScore: 10,
      scorePercentage: 75,
    },
  ],
  raterStats: [
    {
      userId: 'rater-1',
      username: 'rater1',
      displayName: 'Rater One',
      avatarUrl: null,
      totalRatings: 8,
      correctPoints: 6,
      incorrectPoints: 2,
      netScore: 4,
      maxPossibleScore: 8,
      hitRatePercentage: 50,
    },
  ],
  ...overrides,
});

describe('RoundResultsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<RoundResultsClient round={createMockRound()} />);

    expect(screen.getByText('Statistiken werden geladen...')).toBeInTheDocument();
    expect(screen.getByText('Zurück zur Runde')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server Fehler' }),
    });

    render(<RoundResultsClient round={createMockRound()} />);

    await waitFor(() => {
      expect(screen.getByText('Server Fehler')).toBeInTheDocument();
    });
  });

  it('shows generic error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network Error'));

    render(<RoundResultsClient round={createMockRound()} />);

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });

  it('renders statistics after successful fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statistics: createMockStatistics() }),
    });

    render(<RoundResultsClient round={createMockRound()} />);

    await waitFor(() => {
      expect(screen.getByText('Ergebnisse: Test Runde')).toBeInTheDocument();
    });

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Akzeptierte Prophezeiungen')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Ausgewertet')).toBeInTheDocument();
  });

  it('shows incomplete badge when not all prophecies resolved', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          statistics: createMockStatistics({ isComplete: false, resolvedProphecies: 5 }),
        }),
    });

    render(<RoundResultsClient round={createMockRound()} />);

    await waitFor(() => {
      expect(screen.getByText('5 von 10 ausgewertet')).toBeInTheDocument();
    });
  });

  it('shows complete badge when all prophecies resolved', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statistics: createMockStatistics({ isComplete: true }) }),
    });

    render(<RoundResultsClient round={createMockRound()} />);

    await waitFor(() => {
      expect(screen.getByText('Vollständig ausgewertet')).toBeInTheDocument();
    });
  });

  it('shows preview banner when isPreview is true', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statistics: createMockStatistics() }),
    });

    render(<RoundResultsClient round={createMockRound()} isPreview={true} />);

    await waitFor(() => {
      expect(
        screen.getByText('Vorschau – Diese Ergebnisse sind noch nicht veröffentlicht.')
      ).toBeInTheDocument();
    });
  });

  it('does not show preview banner when isPreview is false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statistics: createMockStatistics() }),
    });

    render(<RoundResultsClient round={createMockRound()} isPreview={false} />);

    await waitFor(() => {
      expect(screen.getByText('Ergebnisse: Test Runde')).toBeInTheDocument();
    });

    expect(
      screen.queryByText('Vorschau – Diese Ergebnisse sind noch nicht veröffentlicht.')
    ).not.toBeInTheDocument();
  });

  it('shows published date when resultsPublishedAt is set', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statistics: createMockStatistics() }),
    });

    render(<RoundResultsClient round={createMockRound()} />);

    await waitFor(() => {
      expect(screen.getByText(/Veröffentlicht am/)).toBeInTheDocument();
    });
  });

  it('does not show published date when resultsPublishedAt is null', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statistics: createMockStatistics() }),
    });

    render(<RoundResultsClient round={createMockRound({ resultsPublishedAt: null })} />);

    await waitFor(() => {
      expect(screen.getByText('Ergebnisse: Test Runde')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Veröffentlicht am/)).not.toBeInTheDocument();
  });

  it('renders creator and rater leaderboards', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statistics: createMockStatistics() }),
    });

    render(<RoundResultsClient round={createMockRound()} />);

    await waitFor(() => {
      expect(screen.getByText('Propheten-Ranking')).toBeInTheDocument();
      expect(screen.getByText('Bewerter-Ranking')).toBeInTheDocument();
    });
  });

  it('fetches statistics with correct round id', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statistics: createMockStatistics() }),
    });

    render(<RoundResultsClient round={createMockRound({ id: 'custom-round-id' })} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/rounds/custom-round-id/statistics');
    });
  });
});
