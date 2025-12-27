import { describe, it, expect, beforeEach } from 'vitest';
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
      rounds: {},
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has empty rounds record initially', () => {
      const { rounds } = useRoundStore.getState();
      expect(rounds).toEqual({});
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
    it('sets rounds as record', () => {
      const { setRounds } = useRoundStore.getState();

      act(() => {
        setRounds([mockRound, mockRound2]);
      });

      const { rounds } = useRoundStore.getState();
      expect(Object.keys(rounds)).toHaveLength(2);
      expect(rounds['round-1'].title).toBe('Test Round');
      expect(rounds['round-2'].title).toBe('Another Round');
    });

    it('replaces existing rounds', () => {
      useRoundStore.setState({ rounds: { 'round-1': mockRound } });
      const { setRounds } = useRoundStore.getState();

      act(() => {
        setRounds([mockRound2]);
      });

      const { rounds } = useRoundStore.getState();
      expect(Object.keys(rounds)).toHaveLength(1);
      expect(rounds['round-2']).toBeDefined();
      expect(rounds['round-1']).toBeUndefined();
    });
  });

  describe('setRound', () => {
    it('adds new round', () => {
      const { setRound } = useRoundStore.getState();

      act(() => {
        setRound(mockRound);
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds['round-1']).toEqual(mockRound);
    });

    it('updates existing round', () => {
      useRoundStore.setState({ rounds: { 'round-1': mockRound, 'round-2': mockRound2 } });
      const { setRound } = useRoundStore.getState();

      act(() => {
        setRound({ ...mockRound, title: 'Updated Title' });
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds['round-1'].title).toBe('Updated Title');
      expect(rounds['round-2'].title).toBe('Another Round');
    });

    it('preserves other rounds when adding', () => {
      useRoundStore.setState({ rounds: { 'round-2': mockRound2 } });
      const { setRound } = useRoundStore.getState();

      act(() => {
        setRound(mockRound);
      });

      const { rounds } = useRoundStore.getState();
      expect(Object.keys(rounds)).toHaveLength(2);
      expect(rounds['round-1']).toBeDefined();
      expect(rounds['round-2']).toBeDefined();
    });
  });

  describe('removeRound', () => {
    it('removes round by id', () => {
      useRoundStore.setState({ rounds: { 'round-1': mockRound, 'round-2': mockRound2 } });
      const { removeRound } = useRoundStore.getState();

      act(() => {
        removeRound('round-1');
      });

      const { rounds } = useRoundStore.getState();
      expect(rounds['round-1']).toBeUndefined();
      expect(rounds['round-2']).toBeDefined();
    });

    it('handles deleting non-existent round', () => {
      useRoundStore.setState({ rounds: { 'round-1': mockRound } });
      const { removeRound } = useRoundStore.getState();

      act(() => {
        removeRound('non-existent');
      });

      const { rounds } = useRoundStore.getState();
      expect(Object.keys(rounds)).toHaveLength(1);
    });

    it('handles deleting from empty record', () => {
      const { removeRound } = useRoundStore.getState();

      act(() => {
        removeRound('round-1');
      });

      const { rounds } = useRoundStore.getState();
      expect(Object.keys(rounds)).toHaveLength(0);
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
});
