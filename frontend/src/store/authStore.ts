import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from "../types";

export interface LlmConfig {
  /** Currently selected provider */
  provider: 'openai' | 'gemini' | 'groq';
  /** Per-provider API keys — only the active provider's key is sent to the backend */
  keys: {
    openai: string;
    gemini: string;
    groq: string;
  };
  /** Selected model for the current provider */
  model?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  llmConfig: LlmConfig | null;
  login: (user: User) => void;
  logout: () => void;
  setLlmConfig: (config: LlmConfig | null) => void;
  /** Returns the API key for the currently selected provider, or '' if none */
  getActiveApiKey: () => string;
}

const DEFAULT_KEYS = { openai: '', gemini: '', groq: '' };

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      llmConfig: null,

      login: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false, llmConfig: null }),

      setLlmConfig: (config) => set({ llmConfig: config }),

      getActiveApiKey: () => {
        const { llmConfig } = get();
        if (!llmConfig) return '';
        return llmConfig.keys?.[llmConfig.provider] || '';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
