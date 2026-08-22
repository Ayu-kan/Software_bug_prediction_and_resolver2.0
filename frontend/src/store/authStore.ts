import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Workspace, WorkspaceRole } from "../types";
import { useAnalysisStore } from './analysisStore';

export interface LlmConfig {
  provider: 'openai' | 'gemini' | 'groq';
  keys: {
    openai: string;
    gemini: string;
    groq: string;
  };
  model?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  llmConfig: LlmConfig | null;
  activeWorkspace: Workspace | null;
  userWorkspaces: Workspace[];
  
  login: (user: User, initialConfig?: Partial<LlmConfig>) => void;
  logout: () => void;
  setLlmConfig: (config: LlmConfig | null) => void;
  setActiveWorkspace: (ws: Workspace | null) => void;
  setUserWorkspaces: (workspaces: Workspace[]) => void;
  getActiveApiKey: () => string;
  hasApiKey: () => boolean;
  getCurrentRole: () => WorkspaceRole;
}

const DEFAULT_KEYS = { openai: '', gemini: '', groq: '' };

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      llmConfig: null,
      activeWorkspace: null,
      userWorkspaces: [],

      login: (user, initialConfig) => {
        // Enforce strict user isolation: clear any stale analysis from memory
        try {
          useAnalysisStore.getState().clearAnalysis();
        } catch {}

        const userKeys = {
          ...DEFAULT_KEYS,
          ...(initialConfig?.keys || {})
        };
        const provider = (initialConfig?.provider || 'openai') as 'openai' | 'gemini' | 'groq';
        
        set({
          user,
          isAuthenticated: true,
          activeWorkspace: null,
          userWorkspaces: [],
          llmConfig: {
            provider,
            keys: userKeys,
            model: initialConfig?.model || undefined
          }
        });
      },

      logout: () => {
        try {
          useAnalysisStore.getState().clearAnalysis();
        } catch {}
        try {
          localStorage.removeItem('auth-storage-v2');
        } catch {}
        set({
          user: null,
          isAuthenticated: false,
          llmConfig: null,
          activeWorkspace: null,
          userWorkspaces: []
        });
      },

      setLlmConfig: (config) => set({ llmConfig: config }),

      setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),

      setUserWorkspaces: (workspaces) => set({ userWorkspaces: workspaces }),

      getActiveApiKey: () => {
        const { llmConfig } = get();
        if (!llmConfig || !llmConfig.provider) return '';
        const key = (llmConfig.keys?.[llmConfig.provider] || '').trim();
        return key;
      },

      hasApiKey: () => {
        const activeKey = get().getActiveApiKey();
        return Boolean(activeKey && activeKey.length > 0);
      },

      getCurrentRole: (): WorkspaceRole => {
        const { activeWorkspace } = get();
        if (!activeWorkspace) return 'admin';
        return activeWorkspace.role || 'editor';
      }
    }),
    {
      name: 'auth-storage-v2',
    }
  )
);
