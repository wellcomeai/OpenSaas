import { create } from "zustand";

import { tokenStorage } from "@/api/client";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSession: (user: User, access: string, refresh: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  initialized: false,
  setUser: (user) => set({ user, isLoading: false, initialized: true }),
  setLoading: (isLoading) => set({ isLoading, ...(isLoading === false ? { initialized: true } : {}) }),
  setSession: (user, access, refresh) => {
    tokenStorage.set(access, refresh);
    set({ user, isLoading: false, initialized: true });
  },
  logout: () => {
    tokenStorage.clear();
    set({ user: null, isLoading: false, initialized: true });
  },
}));
