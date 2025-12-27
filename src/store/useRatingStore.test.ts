import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useRatingStore,
  type Rating,
  selectRatingById,
  selectAllRatings,
  selectRatingsByProphecyId,
  selectRatingsByUserId,
  selectUserRatingForProphecy,
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
  });
});
