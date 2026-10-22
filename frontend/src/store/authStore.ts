import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Workspace, WorkspaceRole } from "../types";
import { useAnalysisStore } from './analysisStore';

export interface LlmConfig {
  provider: 'openai' | 'gemini' | 'grok' | 'anthropic';
  keys: {
    openai: string;
    gemini: string;
    grok: string;
    anthropic: string;
  };
  model?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  llmConfig: LlmConfig | null;
  activeWorkspace: Workspace | null;
  userWorkspaces: Workspace[];
  
  login: (user: User, initialConfig?: Partial<LlmConfig>, token?: string, refreshToken?: string) => void;
  logout: () => void;
  setTokens: (token: string, refreshToken?: string) => void;
  setLlmConfig: (config: LlmConfig | null) => void;
  setActiveWorkspace: (ws: Workspace | null) => void;
  setUserWorkspaces: (workspaces: Workspace[]) => void;
  getActiveApiKey: () => string;
  hasApiKey: () => boolean;
  getCurrentRole: () => WorkspaceRole;
}

const DEFAULT_KEYS = { openai: '', gemini: '', grok: '', anthropic: '' };

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      llmConfig: null,
      activeWorkspace: null,
      userWorkspaces: [],

      login: (user, initialConfig, token, refreshToken) => {
        try {
          useAnalysisStore.getState().clearAnalysis();
        } catch {}

        const userKeys = {
          ...DEFAULT_KEYS,
          ...(initialConfig?.keys || {})
        };
        const rawProv = (initialConfig?.provider as string) || 'openai';
        const provider = (rawProv === 'groq' ? 'grok' : rawProv) as 'openai' | 'gemini' | 'grok' | 'anthropic';
        
        set({
          user,
          token: token || null,
          refreshToken: refreshToken || null,
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

      setTokens: (token: string, refreshToken?: string) => {
        set((state) => ({
          token,
          refreshToken: refreshToken || state.refreshToken
        }));
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
          token: null,
          refreshToken: null,
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

