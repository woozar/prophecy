import { create } from 'zustand';

export interface Round {
  id: string;
  title: string;
  submissionDeadline: string;
  ratingDeadline: string;
  fulfillmentDate: string;
  createdAt: string;
  _count?: {
    prophecies: number;
  };
}

interface RoundState {
  rounds: Record<string, Round>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setRounds: (rounds: Round[]) => void;
  setRound: (round: Round) => void;
  removeRound: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRoundStore = create<RoundState>((set) => ({
  rounds: {},
  isLoading: false,
  error: null,

  setRounds: (rounds) =>
    set({
      rounds: rounds.reduce(
        (acc, round) => {
          acc[round.id] = round;
          return acc;
        },
        {} as Record<string, Round>
      ),
    }),

  setRound: (round) => set((state) => ({ rounds: { ...state.rounds, [round.id]: round } })),

  removeRound: (id) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = state.rounds;
      return { rounds: rest };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));

// Selectors
export const selectRoundById = (id: string) => (state: RoundState) => state.rounds[id];
export const selectAllRounds = (state: RoundState) => Object.values(state.rounds);
export const selectRoundsSortedByDate = (state: RoundState) =>
  Object.values(state.rounds).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
