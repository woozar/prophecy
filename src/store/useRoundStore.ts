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
  rounds: Round[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setRounds: (rounds: Round[]) => void;
  addRound: (round: Round) => void;
  updateRound: (round: Round) => void;
  deleteRound: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchRounds: () => Promise<void>;
}

export const useRoundStore = create<RoundState>((set, get) => ({
  rounds: [],
  isLoading: false,
  error: null,

  setRounds: (rounds) => set({ rounds }),

  addRound: (round) =>
    set((state) => {
      // Prüfen ob Runde bereits existiert (verhindert Duplikate durch API + SSE)
      if (state.rounds.some((r) => r.id === round.id)) {
        return { rounds: state.rounds.map((r) => (r.id === round.id ? round : r)) };
      }
      return { rounds: [round, ...state.rounds] };
    }),

  updateRound: (round) =>
    set((state) => ({
      rounds: state.rounds.map((r) => (r.id === round.id ? round : r)),
    })),

  deleteRound: (id) =>
    set((state) => ({
      rounds: state.rounds.filter((r) => r.id !== id),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  fetchRounds: async () => {
    const { setLoading, setError, setRounds } = get();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/rounds');
      if (!res.ok) throw new Error('Fehler beim Laden der Runden');
      const data = await res.json();
      setRounds(data.rounds);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  },
}));
