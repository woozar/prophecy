import { create } from 'zustand';

export interface Prophecy {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  roundId: string;
  createdAt: string;
  fulfilled: boolean | null;
  resolvedAt: string | null;
  averageRating: number | null;
  ratingCount: number;
}

interface ProphecyState {
  prophecies: Record<string, Prophecy>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProphecies: (prophecies: Prophecy[]) => void;
  setProphecy: (prophecy: Prophecy) => void;
  removeProphecy: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProphecyStore = create<ProphecyState>((set) => ({
  prophecies: {},
  isLoading: false,
  error: null,

  setProphecies: (prophecies) =>
    set({
      prophecies: prophecies.reduce(
        (acc, prophecy) => {
          acc[prophecy.id] = prophecy;
          return acc;
        },
        {} as Record<string, Prophecy>
      ),
    }),

  setProphecy: (prophecy) =>
    set((state) => ({ prophecies: { ...state.prophecies, [prophecy.id]: prophecy } })),

  removeProphecy: (id) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = state.prophecies;
      return { prophecies: rest };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));

// Selectors
export const selectProphecyById = (id: string) => (state: ProphecyState) => state.prophecies[id];
export const selectAllProphecies = (state: ProphecyState) => Object.values(state.prophecies);
export const selectPropheciesByRoundId = (roundId: string) => (state: ProphecyState) =>
  Object.values(state.prophecies).filter((p) => p.roundId === roundId);
export const selectPropheciesByCreatorId = (creatorId: string) => (state: ProphecyState) =>
  Object.values(state.prophecies).filter((p) => p.creatorId === creatorId);
