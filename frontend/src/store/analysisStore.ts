import { create } from 'zustand';

interface AnalysisState {
  currentAnalysis: any | null;
  isLoading: boolean;
  setCurrentAnalysis: (data: any) => void;
  setLoading: (loading: boolean) => void;
  clearAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentAnalysis: null,
  isLoading: false,
  setCurrentAnalysis: (data) => set({ currentAnalysis: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearAnalysis: () => set({ currentAnalysis: null }),
}));
