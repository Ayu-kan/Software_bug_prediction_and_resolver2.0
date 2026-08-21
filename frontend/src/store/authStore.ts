import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from "../types";

export interface LlmConfig {
  provider: string;
  apiKey: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  llmConfig: LlmConfig | null;
  login: (user: User) => void;
  logout: () => void;
  setLlmConfig: (config: LlmConfig | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      llmConfig: null,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, llmConfig: null }),
      setLlmConfig: (config) => set({ llmConfig: config }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
