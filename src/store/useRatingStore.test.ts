import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type Rating,
  selectAllRatings,
  selectAverageRatingByProphecyId,
  selectHumanRatingCountByProphecyId,
  selectRatingById,
  selectRatingCountByProphecyId,
  selectRatingsByProphecyId,
  selectRatingsByUserId,
  selectUserRatingForProphecy,
  useRatingStore,
} from './useRatingStore';

describe('useRatingStore', () => {
  const mockRating1: Rating = {
    id: 'rating-1',
    value: 4,
    prophecyId: 'prophecy-1',
    userId: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
  };

  const mockRating2: Rating = {
    id: 'rating-2',
    value: 5,
    prophecyId: 'prophecy-1',
    userId: 'user-2',
    createdAt: '2025-01-02T00:00:00Z',
  };

  const mockRating3: Rating = {
    id: 'rating-3',
    value: 3,
    prophecyId: 'prophecy-2',
    userId: 'user-1',
    createdAt: '2025-01-03T00:00:00Z',
  };

  beforeEach(() => {
    useRatingStore.setState({
      ratings: {},
      ratingsByProphecy: {},
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has empty ratings record initially', () => {
      const { ratings } = useRatingStore.getState();
      expect(ratings).toEqual({});
    });

    it('has empty ratingsByProphecy index initially', () => {
      const { ratingsByProphecy } = useRatingStore.getState();
      expect(ratingsByProphecy).toEqual({});
    });

    it('is not loading initially', () => {
      const { isLoading } = useRatingStore.getState();
      expect(isLoading).toBe(false);
    });

    it('has no error initially', () => {
      const { error } = useRatingStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setRatings', () => {
    it('sets ratings as record from array and builds prophecy index', () => {
      const { setRatings } = useRatingStore.getState();

      act(() => {
        setRatings([mockRating1, mockRating2, mockRating3]);
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(Object.keys(ratings)).toHaveLength(3);
      expect(ratings['rating-1']).toEqual(mockRating1);
      expect(ratings['rating-2']).toEqual(mockRating2);
      expect(ratings['rating-3']).toEqual(mockRating3);

      // Check prophecy index
      expect(ratingsByProphecy['prophecy-1']).toHaveLength(2);
      expect(ratingsByProphecy['prophecy-2']).toHaveLength(1);
    });

    it('replaces existing ratings', () => {
      useRatingStore.setState({
        ratings: { 'rating-1': mockRating1 },
        ratingsByProphecy: { 'prophecy-1': [mockRating1] },
      });
      const { setRatings } = useRatingStore.getState();

      act(() => {
        setRatings([mockRating3]);
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(Object.keys(ratings)).toHaveLength(1);
      expect(ratings['rating-3']).toBeDefined();
      expect(ratings['rating-1']).toBeUndefined();
      expect(ratingsByProphecy['prophecy-2']).toHaveLength(1);
      expect(ratingsByProphecy['prophecy-1']).toBeUndefined();
    });

    it('handles empty array', () => {
      useRatingStore.setState({
        ratings: { 'rating-1': mockRating1 },
        ratingsByProphecy: { 'prophecy-1': [mockRating1] },
      });
      const { setRatings } = useRatingStore.getState();

      act(() => {
        setRatings([]);
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(Object.keys(ratings)).toHaveLength(0);
      expect(Object.keys(ratingsByProphecy)).toHaveLength(0);
    });
  });

  describe('setRating', () => {
    it('adds new rating and updates prophecy index', () => {
      const { setRating } = useRatingStore.getState();

      act(() => {
        setRating(mockRating1);
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(ratings['rating-1']).toEqual(mockRating1);
      expect(ratingsByProphecy['prophecy-1']).toHaveLength(1);
      expect(ratingsByProphecy['prophecy-1'][0]).toEqual(mockRating1);
    });

    it('updates existing rating and maintains prophecy index', () => {
      useRatingStore.setState({
        ratings: { 'rating-1': mockRating1 },
        ratingsByProphecy: { 'prophecy-1': [mockRating1] },
      });
      const { setRating } = useRatingStore.getState();
      const updatedRating = { ...mockRating1, value: 5 };

      act(() => {
        setRating(updatedRating);
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(ratings['rating-1'].value).toBe(5);
      expect(ratingsByProphecy['prophecy-1']).toHaveLength(1);
      expect(ratingsByProphecy['prophecy-1'][0].value).toBe(5);
    });

    it('preserves other ratings when adding', () => {
      useRatingStore.setState({
        ratings: { 'rating-1': mockRating1 },
        ratingsByProphecy: { 'prophecy-1': [mockRating1] },
      });
      const { setRating } = useRatingStore.getState();

      act(() => {
        setRating(mockRating2);
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(Object.keys(ratings)).toHaveLength(2);
      expect(ratingsByProphecy['prophecy-1']).toHaveLength(2);
    });
  });

  describe('removeRating', () => {
    it('removes rating by id and updates prophecy index', () => {
      useRatingStore.setState({
        ratings: { 'rating-1': mockRating1, 'rating-2': mockRating2 },
        ratingsByProphecy: { 'prophecy-1': [mockRating1, mockRating2] },
      });
      const { removeRating } = useRatingStore.getState();

      act(() => {
        removeRating('rating-1');
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(ratings['rating-1']).toBeUndefined();
      expect(ratings['rating-2']).toBeDefined();
      expect(ratingsByProphecy['prophecy-1']).toHaveLength(1);
      expect(ratingsByProphecy['prophecy-1'][0]).toEqual(mockRating2);
    });

    it('handles removing non-existent rating', () => {
      useRatingStore.setState({
        ratings: { 'rating-1': mockRating1 },
        ratingsByProphecy: { 'prophecy-1': [mockRating1] },
      });
      const { removeRating } = useRatingStore.getState();

      act(() => {
        removeRating('non-existent');
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(Object.keys(ratings)).toHaveLength(1);
      expect(ratingsByProphecy['prophecy-1']).toHaveLength(1);
    });

    it('handles removing from empty record', () => {
      const { removeRating } = useRatingStore.getState();

      act(() => {
        removeRating('rating-1');
      });

      const { ratings, ratingsByProphecy } = useRatingStore.getState();
      expect(Object.keys(ratings)).toHaveLength(0);
      expect(Object.keys(ratingsByProphecy)).toHaveLength(0);
    });
  });

  describe('setLoading', () => {
    it('sets loading to true', () => {
      const { setLoading } = useRatingStore.getState();

      act(() => {
        setLoading(true);
      });

      const { isLoading } = useRatingStore.getState();
      expect(isLoading).toBe(true);
    });

    it('sets loading to false', () => {
      useRatingStore.setState({ isLoading: true });
      const { setLoading } = useRatingStore.getState();

      act(() => {
        setLoading(false);
      });

      const { isLoading } = useRatingStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      const { setError } = useRatingStore.getState();

      act(() => {
        setError('Something went wrong');
      });

      const { error } = useRatingStore.getState();
      expect(error).toBe('Something went wrong');
    });

    it('clears error with null', () => {
      useRatingStore.setState({ error: 'Previous error' });
      const { setError } = useRatingStore.getState();

      act(() => {
        setError(null);
      });

      const { error } = useRatingStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useRatingStore.setState({
        ratings: {
          'rating-1': mockRating1,
          'rating-2': mockRating2,
          'rating-3': mockRating3,
        },
        ratingsByProphecy: {
          'prophecy-1': [mockRating1, mockRating2],
          'prophecy-2': [mockRating3],
        },
      });
    });

    describe('selectRatingById', () => {
      it('returns rating by id', () => {
        const state = useRatingStore.getState();
        const result = selectRatingById('rating-1')(state);
        expect(result).toEqual(mockRating1);
      });

      it('returns undefined for non-existent id', () => {
        const state = useRatingStore.getState();
        const result = selectRatingById('non-existent')(state);
        expect(result).toBeUndefined();
      });
    });

    describe('selectAllRatings', () => {
      it('returns all ratings as array', () => {
        const state = useRatingStore.getState();
        const result = selectAllRatings(state);
        expect(result).toHaveLength(3);
        expect(result).toContainEqual(mockRating1);
        expect(result).toContainEqual(mockRating2);
        expect(result).toContainEqual(mockRating3);
      });

      it('returns empty array when no ratings', () => {
        useRatingStore.setState({ ratings: {} });
        const state = useRatingStore.getState();
        const result = selectAllRatings(state);
        expect(result).toEqual([]);
      });
    });

    describe('selectRatingsByProphecyId', () => {
      it('returns ratings for specific prophecy from index', () => {
        const state = useRatingStore.getState();
        const result = selectRatingsByProphecyId('prophecy-1')(state);
        expect(result).toHaveLength(2);
        expect(result).toContainEqual(mockRating1);
        expect(result).toContainEqual(mockRating2);
      });

      it('returns empty array for prophecy with no ratings', () => {
        const state = useRatingStore.getState();
        const result = selectRatingsByProphecyId('prophecy-99')(state);
        expect(result).toEqual([]);
      });
    });

    describe('selectRatingsByUserId', () => {
      it('returns ratings for specific user', () => {
        const state = useRatingStore.getState();
        const result = selectRatingsByUserId('user-1')(state);
        expect(result).toHaveLength(2);
        expect(result).toContainEqual(mockRating1);
        expect(result).toContainEqual(mockRating3);
      });

      it('returns empty array for user with no ratings', () => {
        const state = useRatingStore.getState();
        const result = selectRatingsByUserId('user-99')(state);
        expect(result).toEqual([]);
      });
    });

    describe('selectUserRatingForProphecy', () => {
      it('returns user rating for specific prophecy', () => {
        const state = useRatingStore.getState();
        const result = selectUserRatingForProphecy('prophecy-1', 'user-1')(state);
        expect(result).toEqual(mockRating1);
      });

      it('returns undefined when user has no rating for prophecy', () => {
        const state = useRatingStore.getState();
        const result = selectUserRatingForProphecy('prophecy-1', 'user-99')(state);
        expect(result).toBeUndefined();
      });

      it('returns undefined for non-existent prophecy', () => {
        const state = useRatingStore.getState();
        const result = selectUserRatingForProphecy('prophecy-99', 'user-1')(state);
        expect(result).toBeUndefined();
      });
    });

    describe('selectRatingCountByProphecyId', () => {
      it('returns count of non-zero ratings', () => {
        const state = useRatingStore.getState();
        const result = selectRatingCountByProphecyId('prophecy-1')(state);
        expect(result).toBe(2); // mockRating1 (value=4) and mockRating2 (value=5)
      });

      it('excludes zero-value ratings from count', () => {
        const zeroRating: Rating = {
          id: 'rating-zero',
          value: 0,
          prophecyId: 'prophecy-1',
          userId: 'user-3',
          createdAt: '2025-01-04T00:00:00Z',
        };
        useRatingStore.setState({
          ratings: {
            'rating-1': mockRating1,
            'rating-zero': zeroRating,
          },
          ratingsByProphecy: {
            'prophecy-1': [mockRating1, zeroRating],
          },
        });
        const state = useRatingStore.getState();
        const result = selectRatingCountByProphecyId('prophecy-1')(state);
        expect(result).toBe(1); // Only mockRating1 counted
      });

      it('returns 0 for prophecy with no ratings', () => {
        const state = useRatingStore.getState();
        const result = selectRatingCountByProphecyId('prophecy-99')(state);
        expect(result).toBe(0);
      });
    });

    describe('selectHumanRatingCountByProphecyId', () => {
      const botUserIds = new Set(['bot-1', 'bot-2']);

      it('returns count of human non-zero ratings', () => {
        const state = useRatingStore.getState();
        const result = selectHumanRatingCountByProphecyId('prophecy-1', botUserIds)(state);
        expect(result).toBe(2); // Both ratings are from humans
      });

      it('excludes bot ratings from count', () => {
        const botRating: Rating = {
          id: 'rating-bot',
          value: 5,
          prophecyId: 'prophecy-1',
          userId: 'bot-1',
          createdAt: '2025-01-04T00:00:00Z',
        };
        useRatingStore.setState({
          ratings: {
            'rating-1': mockRating1,
            'rating-bot': botRating,
          },
          ratingsByProphecy: {
            'prophecy-1': [mockRating1, botRating],
          },
        });
        const state = useRatingStore.getState();
        const result = selectHumanRatingCountByProphecyId('prophecy-1', botUserIds)(state);
        expect(result).toBe(1); // Only mockRating1 counted
      });

      it('excludes zero-value ratings from count', () => {
        const zeroRating: Rating = {
          id: 'rating-zero',
          value: 0,
          prophecyId: 'prophecy-1',
          userId: 'user-3',
          createdAt: '2025-01-04T00:00:00Z',
        };
        useRatingStore.setState({
          ratings: {
            'rating-1': mockRating1,
            'rating-zero': zeroRating,
          },
          ratingsByProphecy: {
            'prophecy-1': [mockRating1, zeroRating],
          },
        });
        const state = useRatingStore.getState();
        const result = selectHumanRatingCountByProphecyId('prophecy-1', botUserIds)(state);
        expect(result).toBe(1);
      });

      it('returns 0 for prophecy with no ratings', () => {
        const state = useRatingStore.getState();
        const result = selectHumanRatingCountByProphecyId('prophecy-99', botUserIds)(state);
        expect(result).toBe(0);
      });
    });

    describe('selectAverageRatingByProphecyId', () => {
      const botUserIds = new Set(['bot-1', 'bot-2']);

      it('calculates average of human non-zero ratings', () => {
        const state = useRatingStore.getState();
        const result = selectAverageRatingByProphecyId('prophecy-1', botUserIds)(state);
        expect(result).toBe(4.5); // (4 + 5) / 2
      });

      it('excludes bot ratings from average', () => {
        const botRating: Rating = {
          id: 'rating-bot',
          value: 10,
          prophecyId: 'prophecy-1',
          userId: 'bot-1',
          createdAt: '2025-01-04T00:00:00Z',
        };
        useRatingStore.setState({
          ratings: {
            'rating-1': mockRating1,
            'rating-2': mockRating2,
            'rating-bot': botRating,
          },
          ratingsByProphecy: {
            'prophecy-1': [mockRating1, mockRating2, botRating],
          },
        });
        const state = useRatingStore.getState();
        const result = selectAverageRatingByProphecyId('prophecy-1', botUserIds)(state);
        expect(result).toBe(4.5); // Bot rating excluded
      });

      it('excludes zero-value ratings from average', () => {
        const zeroRating: Rating = {
          id: 'rating-zero',
          value: 0,
          prophecyId: 'prophecy-1',
          userId: 'user-3',
          createdAt: '2025-01-04T00:00:00Z',
        };
        useRatingStore.setState({
          ratings: {
            'rating-1': mockRating1,
            'rating-zero': zeroRating,
          },
          ratingsByProphecy: {
            'prophecy-1': [mockRating1, zeroRating],
          },
        });
        const state = useRatingStore.getState();
        const result = selectAverageRatingByProphecyId('prophecy-1', botUserIds)(state);
        expect(result).toBe(4); // Only mockRating1 value
      });

      it('returns null for prophecy with no human non-zero ratings', () => {
        const botRating: Rating = {
          id: 'rating-bot',
          value: 5,
          prophecyId: 'prophecy-1',
          userId: 'bot-1',
          createdAt: '2025-01-04T00:00:00Z',
        };
        useRatingStore.setState({
          ratings: {
            'rating-bot': botRating,
          },
          ratingsByProphecy: {
            'prophecy-1': [botRating],
          },
        });
        const state = useRatingStore.getState();
        const result = selectAverageRatingByProphecyId('prophecy-1', botUserIds)(state);
        expect(result).toBeNull();
      });

      it('returns null for prophecy with no ratings', () => {
        const state = useRatingStore.getState();
        const result = selectAverageRatingByProphecyId('prophecy-99', botUserIds)(state);
        expect(result).toBeNull();
      });
    });
  });
});
