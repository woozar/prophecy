import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useProphecyStore,
  type Prophecy,
  selectProphecyById,
  selectAllProphecies,
  selectPropheciesByRoundId,
  selectPropheciesByCreatorId,
} from './useProphecyStore';

describe('useProphecyStore', () => {
  const mockProphecy1: Prophecy = {
    id: 'prophecy-1',
    title: 'Test Prophecy 1',
    description: 'Description 1',
    creatorId: 'user-1',
    roundId: 'round-1',
    createdAt: '2025-01-01T00:00:00Z',
    fulfilled: null,
    resolvedAt: null,
    averageRating: null,
    ratingCount: 0,
  };

  const mockProphecy2: Prophecy = {
    id: 'prophecy-2',
    title: 'Test Prophecy 2',
    description: 'Description 2',
    creatorId: 'user-2',
    roundId: 'round-1',
    createdAt: '2025-01-02T00:00:00Z',
    fulfilled: true,
    resolvedAt: '2025-02-01T00:00:00Z',
    averageRating: 4.5,
    ratingCount: 10,
  };

  const mockProphecy3: Prophecy = {
    id: 'prophecy-3',
    title: 'Test Prophecy 3',
    description: 'Description 3',
    creatorId: 'user-1',
    roundId: 'round-2',
    createdAt: '2025-01-03T00:00:00Z',
    fulfilled: false,
    resolvedAt: '2025-02-02T00:00:00Z',
    averageRating: 2.5,
    ratingCount: 5,
  };

  beforeEach(() => {
    useProphecyStore.setState({
      prophecies: {},
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has empty prophecies record initially', () => {
      const { prophecies } = useProphecyStore.getState();
      expect(prophecies).toEqual({});
    });

    it('is not loading initially', () => {
      const { isLoading } = useProphecyStore.getState();
      expect(isLoading).toBe(false);
    });

    it('has no error initially', () => {
      const { error } = useProphecyStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setProphecies', () => {
    it('sets prophecies as record from array', () => {
      const { setProphecies } = useProphecyStore.getState();

      act(() => {
        setProphecies([mockProphecy1, mockProphecy2]);
      });

      const { prophecies } = useProphecyStore.getState();
      expect(Object.keys(prophecies)).toHaveLength(2);
      expect(prophecies['prophecy-1']).toEqual(mockProphecy1);
      expect(prophecies['prophecy-2']).toEqual(mockProphecy2);
    });

    it('replaces existing prophecies', () => {
      useProphecyStore.setState({
        prophecies: { 'prophecy-1': mockProphecy1 },
      });
      const { setProphecies } = useProphecyStore.getState();

      act(() => {
        setProphecies([mockProphecy2]);
      });

      const { prophecies } = useProphecyStore.getState();
      expect(Object.keys(prophecies)).toHaveLength(1);
      expect(prophecies['prophecy-2']).toBeDefined();
      expect(prophecies['prophecy-1']).toBeUndefined();
    });

    it('handles empty array', () => {
      useProphecyStore.setState({
        prophecies: { 'prophecy-1': mockProphecy1 },
      });
      const { setProphecies } = useProphecyStore.getState();

      act(() => {
        setProphecies([]);
      });

      const { prophecies } = useProphecyStore.getState();
      expect(Object.keys(prophecies)).toHaveLength(0);
    });
  });

  describe('setProphecy', () => {
    it('adds new prophecy', () => {
      const { setProphecy } = useProphecyStore.getState();

      act(() => {
        setProphecy(mockProphecy1);
      });

      const { prophecies } = useProphecyStore.getState();
      expect(prophecies['prophecy-1']).toEqual(mockProphecy1);
    });

    it('updates existing prophecy', () => {
      useProphecyStore.setState({
        prophecies: { 'prophecy-1': mockProphecy1 },
      });
      const { setProphecy } = useProphecyStore.getState();
      const updatedProphecy = { ...mockProphecy1, title: 'Updated Title' };

      act(() => {
        setProphecy(updatedProphecy);
      });

      const { prophecies } = useProphecyStore.getState();
      expect(prophecies['prophecy-1'].title).toBe('Updated Title');
    });

    it('preserves other prophecies when adding', () => {
      useProphecyStore.setState({
        prophecies: { 'prophecy-1': mockProphecy1 },
      });
      const { setProphecy } = useProphecyStore.getState();

      act(() => {
        setProphecy(mockProphecy2);
      });

      const { prophecies } = useProphecyStore.getState();
      expect(Object.keys(prophecies)).toHaveLength(2);
      expect(prophecies['prophecy-1']).toBeDefined();
      expect(prophecies['prophecy-2']).toBeDefined();
    });
  });

  describe('removeProphecy', () => {
    it('removes prophecy by id', () => {
      useProphecyStore.setState({
        prophecies: { 'prophecy-1': mockProphecy1, 'prophecy-2': mockProphecy2 },
      });
      const { removeProphecy } = useProphecyStore.getState();

      act(() => {
        removeProphecy('prophecy-1');
      });

      const { prophecies } = useProphecyStore.getState();
      expect(prophecies['prophecy-1']).toBeUndefined();
      expect(prophecies['prophecy-2']).toBeDefined();
    });

    it('handles removing non-existent prophecy', () => {
      useProphecyStore.setState({
        prophecies: { 'prophecy-1': mockProphecy1 },
      });
      const { removeProphecy } = useProphecyStore.getState();

      act(() => {
        removeProphecy('non-existent');
      });

      const { prophecies } = useProphecyStore.getState();
      expect(Object.keys(prophecies)).toHaveLength(1);
    });

    it('handles removing from empty record', () => {
      const { removeProphecy } = useProphecyStore.getState();

      act(() => {
        removeProphecy('prophecy-1');
      });

      const { prophecies } = useProphecyStore.getState();
      expect(Object.keys(prophecies)).toHaveLength(0);
    });
  });

  describe('setLoading', () => {
    it('sets loading to true', () => {
      const { setLoading } = useProphecyStore.getState();

      act(() => {
        setLoading(true);
      });

      const { isLoading } = useProphecyStore.getState();
      expect(isLoading).toBe(true);
    });

    it('sets loading to false', () => {
      useProphecyStore.setState({ isLoading: true });
      const { setLoading } = useProphecyStore.getState();

      act(() => {
        setLoading(false);
      });

      const { isLoading } = useProphecyStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      const { setError } = useProphecyStore.getState();

      act(() => {
        setError('Something went wrong');
      });

      const { error } = useProphecyStore.getState();
      expect(error).toBe('Something went wrong');
    });

    it('clears error with null', () => {
      useProphecyStore.setState({ error: 'Previous error' });
      const { setError } = useProphecyStore.getState();

      act(() => {
        setError(null);
      });

      const { error } = useProphecyStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useProphecyStore.setState({
        prophecies: {
          'prophecy-1': mockProphecy1,
          'prophecy-2': mockProphecy2,
          'prophecy-3': mockProphecy3,
        },
      });
    });

    describe('selectProphecyById', () => {
      it('returns prophecy by id', () => {
        const state = useProphecyStore.getState();
        const result = selectProphecyById('prophecy-1')(state);
        expect(result).toEqual(mockProphecy1);
      });

      it('returns undefined for non-existent id', () => {
        const state = useProphecyStore.getState();
        const result = selectProphecyById('non-existent')(state);
        expect(result).toBeUndefined();
      });
    });

    describe('selectAllProphecies', () => {
      it('returns all prophecies as array', () => {
        const state = useProphecyStore.getState();
        const result = selectAllProphecies(state);
        expect(result).toHaveLength(3);
        expect(result).toContainEqual(mockProphecy1);
        expect(result).toContainEqual(mockProphecy2);
        expect(result).toContainEqual(mockProphecy3);
      });

      it('returns empty array when no prophecies', () => {
        useProphecyStore.setState({ prophecies: {} });
        const state = useProphecyStore.getState();
        const result = selectAllProphecies(state);
        expect(result).toEqual([]);
      });
    });

    describe('selectPropheciesByRoundId', () => {
      it('returns prophecies for specific round', () => {
        const state = useProphecyStore.getState();
        const result = selectPropheciesByRoundId('round-1')(state);
        expect(result).toHaveLength(2);
        expect(result).toContainEqual(mockProphecy1);
        expect(result).toContainEqual(mockProphecy2);
      });

      it('returns empty array for round with no prophecies', () => {
        const state = useProphecyStore.getState();
        const result = selectPropheciesByRoundId('round-99')(state);
        expect(result).toEqual([]);
      });
    });

    describe('selectPropheciesByCreatorId', () => {
      it('returns prophecies for specific creator', () => {
        const state = useProphecyStore.getState();
        const result = selectPropheciesByCreatorId('user-1')(state);
        expect(result).toHaveLength(2);
        expect(result).toContainEqual(mockProphecy1);
        expect(result).toContainEqual(mockProphecy3);
      });

      it('returns empty array for creator with no prophecies', () => {
        const state = useProphecyStore.getState();
        const result = selectPropheciesByCreatorId('user-99')(state);
        expect(result).toEqual([]);
      });
    });
  });
});
