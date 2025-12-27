import { create } from 'zustand';

export interface Rating {
  id: string;
  value: number;
  prophecyId: string;
  userId: string;
  createdAt: string;
}

interface RatingState {
  ratings: Record<string, Rating>;
  // Index: prophecyId -> Rating[] für schnellen Zugriff
  ratingsByProphecy: Record<string, Rating[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setRatings: (ratings: Rating[]) => void;
  setRating: (rating: Rating) => void;
  removeRating: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Helper: Baut den prophecyId-Index aus der Ratings-Map
function buildProphecyIndex(ratings: Record<string, Rating>): Record<string, Rating[]> {
  const index: Record<string, Rating[]> = {};
  for (const rating of Object.values(ratings)) {
    if (!index[rating.prophecyId]) {
      index[rating.prophecyId] = [];
    }
    index[rating.prophecyId].push(rating);
  }
  return index;
}

export const useRatingStore = create<RatingState>((set) => ({
  ratings: {},
  ratingsByProphecy: {},
  isLoading: false,
  error: null,

  setRatings: (ratings) => {
    const ratingsMap = ratings.reduce(
      (acc, rating) => {
        acc[rating.id] = rating;
        return acc;
      },
      {} as Record<string, Rating>
    );
    set({
      ratings: ratingsMap,
      ratingsByProphecy: buildProphecyIndex(ratingsMap),
    });
  },

  setRating: (rating) =>
    set((state) => {
      const newRatings = { ...state.ratings, [rating.id]: rating };
      // Update prophecy index
      const prophecyRatings = Object.values(newRatings).filter(
        (r) => r.prophecyId === rating.prophecyId
      );
      return {
        ratings: newRatings,
        ratingsByProphecy: {
          ...state.ratingsByProphecy,
          [rating.prophecyId]: prophecyRatings,
        },
      };
    }),

  removeRating: (id) =>
    set((state) => {
      const rating = state.ratings[id];
      if (!rating) return state;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = state.ratings;
      // Update prophecy index
      const prophecyRatings = (state.ratingsByProphecy[rating.prophecyId] || []).filter(
        (r) => r.id !== id
      );
      return {
        ratings: rest,
        ratingsByProphecy: {
          ...state.ratingsByProphecy,
          [rating.prophecyId]: prophecyRatings,
        },
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));

// Selectors
export const selectRatingById = (id: string) => (state: RatingState) => state.ratings[id];
export const selectAllRatings = (state: RatingState) => Object.values(state.ratings);
export const selectRatingsByProphecyId = (prophecyId: string) => (state: RatingState) =>
  state.ratingsByProphecy[prophecyId] || [];
export const selectRatingsByUserId = (userId: string) => (state: RatingState) =>
  Object.values(state.ratings).filter((r) => r.userId === userId);
export const selectUserRatingForProphecy =
  (prophecyId: string, userId: string) => (state: RatingState) =>
    (state.ratingsByProphecy[prophecyId] || []).find((r) => r.userId === userId);
