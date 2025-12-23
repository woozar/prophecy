import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useRoundStore, type Round } from './useRoundStore';

describe('useRoundStore', () => {
  const mockRound: Round = {
    id: 'round-1',
    title: 'Test Round',
    submissionDeadline: '2025-01-01T00:00:00Z',
    ratingDeadline: '2025-01-15T00:00:00Z',
    fulfillmentDate: '2025-02-01T00:00:00Z',
    createdAt: '2024-12-01T00:00:00Z',
    _count: { prophecies: 5 },
  };

  const mockRound2: Round = {
    id: 'round-2',
    title: 'Another Round',
    submissionDeadline: '2025-02-01T00:00:00Z',
    ratingDeadline: '2025-02-15T00:00:00Z',
    fulfillmentDate: '2025-03-01T00:00:00Z',
    createdAt: '2024-12-15T00:00:00Z',
    _count: { prophecies: 3 },
  };

  beforeEach(() => {
    // Reset store state before each test
    useRoundStore.setState({
      rounds: [],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('has empty rounds array initially', () => {
      const { rounds } = useRoundStore.getState();
      expect(rounds).toEqual([]);
    });

    it('is not loading initially', () => {
      const { isLoading } = useRoundStore.getState();
      expect(isLoading).toBe(false);
    });

    it('has no error initially', () => {
      const { error } = useRoundStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setRounds', () => {
    it('sets rounds to provided array', () => {
      const { setRounds } = useRoundStore.getState();

      act(() => {
        setRounds([mockRound, mockRound2]);
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(2);
      expect(rounds[0].id).toBe('round-1');
      expect(rounds[1].id).toBe('round-2');
    });

    it('replaces existing rounds', () => {
      useRoundStore.setState({ rounds: [mockRound] });
      const { setRounds } = useRoundStore.getState();

      act(() => {
        setRounds([mockRound2]);
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(1);
      expect(rounds[0].id).toBe('round-2');
    });
  });

  describe('addRound', () => {
    it('adds new round to the beginning of the list', () => {
      useRoundStore.setState({ rounds: [mockRound2] });
      const { addRound } = useRoundStore.getState();

      act(() => {
        addRound(mockRound);
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(2);
      expect(rounds[0].id).toBe('round-1');
      expect(rounds[1].id).toBe('round-2');
    });

    it('updates existing round instead of adding duplicate', () => {
      useRoundStore.setState({ rounds: [mockRound] });
      const { addRound } = useRoundStore.getState();

      const updatedRound = { ...mockRound, title: 'Updated Title' };
      act(() => {
        addRound(updatedRound);
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(1);
      expect(rounds[0].title).toBe('Updated Title');
    });

    it('handles adding to empty list', () => {
      const { addRound } = useRoundStore.getState();

      act(() => {
        addRound(mockRound);
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(1);
      expect(rounds[0].id).toBe('round-1');
    });
  });

  describe('updateRound', () => {
    it('updates existing round', () => {
      useRoundStore.setState({ rounds: [mockRound, mockRound2] });
      const { updateRound } = useRoundStore.getState();

      const updatedRound = { ...mockRound, title: 'New Title' };
      act(() => {
        updateRound(updatedRound);
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds[0].title).toBe('New Title');
      expect(rounds[1].title).toBe('Another Round');
    });

    it('does not modify other rounds', () => {
      useRoundStore.setState({ rounds: [mockRound, mockRound2] });
      const { updateRound } = useRoundStore.getState();

      act(() => {
        updateRound({ ...mockRound, title: 'Updated' });
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds[1]).toEqual(mockRound2);
    });

    it('handles updating non-existent round (no-op)', () => {
      useRoundStore.setState({ rounds: [mockRound] });
      const { updateRound } = useRoundStore.getState();

      act(() => {
        updateRound({ ...mockRound2, title: 'Ghost Round' });
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(1);
      expect(rounds[0].id).toBe('round-1');
    });
  });

  describe('deleteRound', () => {
    it('removes round by id', () => {
      useRoundStore.setState({ rounds: [mockRound, mockRound2] });
      const { deleteRound } = useRoundStore.getState();

      act(() => {
        deleteRound('round-1');
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(1);
      expect(rounds[0].id).toBe('round-2');
    });

    it('handles deleting non-existent round', () => {
      useRoundStore.setState({ rounds: [mockRound] });
      const { deleteRound } = useRoundStore.getState();

      act(() => {
        deleteRound('non-existent');
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(1);
    });

    it('handles deleting from empty list', () => {
      const { deleteRound } = useRoundStore.getState();

      act(() => {
        deleteRound('round-1');
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds).toHaveLength(0);
    });
  });

  describe('setLoading', () => {
    it('sets loading to true', () => {
      const { setLoading } = useRoundStore.getState();

      act(() => {
        setLoading(true);
      });

      const { isLoading } = useRoundStore.getState();
      expect(isLoading).toBe(true);
    });

    it('sets loading to false', () => {
      useRoundStore.setState({ isLoading: true });
      const { setLoading } = useRoundStore.getState();

      act(() => {
        setLoading(false);
      });

      const { isLoading } = useRoundStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      const { setError } = useRoundStore.getState();

      act(() => {
        setError('Something went wrong');
      });

      const { error } = useRoundStore.getState();
      expect(error).toBe('Something went wrong');
    });

    it('clears error with null', () => {
      useRoundStore.setState({ error: 'Previous error' });
      const { setError } = useRoundStore.getState();

      act(() => {
        setError(null);
      });

      const { error } = useRoundStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('fetchRounds', () => {
    it('sets loading state during fetch', async () => {
      const mockFetch = vi.fn(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ rounds: [mockRound] }),
            });
          }, 10);
        })
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      const { fetchRounds } = useRoundStore.getState();

      const fetchPromise = fetchRounds();

      // Should be loading immediately
      expect(useRoundStore.getState().isLoading).toBe(true);

      await fetchPromise;

      // Should stop loading after fetch
      expect(useRoundStore.getState().isLoading).toBe(false);
    });

    it('fetches and sets rounds on success', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ rounds: [mockRound, mockRound2] }),
        })
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      const { fetchRounds } = useRoundStore.getState();
      await fetchRounds();

      const { rounds, error } = useRoundStore.getState();
      expect(rounds).toHaveLength(2);
      expect(error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/rounds');
    });

    it('sets error on API failure', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      const { fetchRounds } = useRoundStore.getState();
      await fetchRounds();

      const { error, isLoading } = useRoundStore.getState();
      expect(error).toBe('Fehler beim Laden der Runden');
      expect(isLoading).toBe(false);
    });

    it('sets error on network failure', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      const { fetchRounds } = useRoundStore.getState();
      await fetchRounds();

      const { error } = useRoundStore.getState();
      expect(error).toBe('Network error');
    });

    it('sets generic error for non-Error exceptions', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject('Unknown failure')
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      const { fetchRounds } = useRoundStore.getState();
      await fetchRounds();

      const { error } = useRoundStore.getState();
      expect(error).toBe('Unbekannter Fehler');
    });

    it('clears previous error on new fetch', async () => {
      useRoundStore.setState({ error: 'Previous error' });

      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ rounds: [] }),
        })
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      const { fetchRounds } = useRoundStore.getState();
      await fetchRounds();

      const { error } = useRoundStore.getState();
      expect(error).toBeNull();
    });
  });
});
