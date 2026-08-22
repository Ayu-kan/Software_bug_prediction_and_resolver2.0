import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Workspace, WorkspaceRole } from "../types";

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
        const currentConfig = get().llmConfig;
        const mergedKeys = {
          ...DEFAULT_KEYS,
          ...(currentConfig?.keys || {}),
          ...(initialConfig?.keys || {})
        };
        const provider = (initialConfig?.provider || currentConfig?.provider || 'openai') as 'openai' | 'gemini' | 'groq';
        
        set({
          user,
          isAuthenticated: true,
          llmConfig: {
            provider,
            keys: mergedKeys,
            model: initialConfig?.model || currentConfig?.model
          }
        });
      },

      logout: () => set({
        user: null,
        isAuthenticated: false,
        llmConfig: null,
        activeWorkspace: null,
        userWorkspaces: []
      }),

      setLlmConfig: (config) => set({ llmConfig: config }),

      setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),

      setUserWorkspaces: (workspaces) => set({ userWorkspaces: workspaces }),

      getActiveApiKey: () => {
        const { llmConfig } = get();
        if (!llmConfig || !llmConfig.provider) return '';
        return (llmConfig.keys?.[llmConfig.provider] || '').trim();
      },

      hasApiKey: () => {
        const activeKey = get().getActiveApiKey();
        return activeKey.length > 0;
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
