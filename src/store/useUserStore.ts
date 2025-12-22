import { create } from "zustand";

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count?: {
    prophecies: number;
    ratings: number;
  };
}

interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setUsers: (users: User[]) => void;
  updateUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchUsers: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  setUsers: (users) => set({ users }),

  updateUser: (user) => set((state) => ({
    users: state.users.map((u) => u.id === user.id ? user : u)
  })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  fetchUsers: async () => {
    const { setLoading, setError, setUsers } = get();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Fehler beim Laden der Benutzer");
      const data = await res.json();
      setUsers(data.users);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  },
}));
