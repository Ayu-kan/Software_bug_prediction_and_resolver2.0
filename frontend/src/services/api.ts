import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type {
  RegisterRequest, LoginRequest, ConfigRequest, AnalysisRequest, ResolveRequest
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8000');

const api = axios.create({
  baseURL: API_BASE,
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: 401 Catch and Refresh Token Rotation
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err: any) => reject(err)
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        isRefreshing = false;
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
        if (res.data.success && (res.data.access_token || res.data.token)) {
          const newToken = res.data.access_token || res.data.token;
          const newRefresh = res.data.refresh_token;
          useAuthStore.getState().setTokens(newToken, newRefresh);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          processQueue(error, null);
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: RegisterRequest) => api.post('/auth/register', data).then(r => r.data),
  login: (data: LoginRequest) => api.post('/auth/login', data).then(r => r.data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refresh_token: refreshToken }).then(r => r.data),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refresh_token: refreshToken }).then(r => r.data),
  updateConfig: (data: ConfigRequest) => api.post('/auth/config', data).then(r => r.data),
  getConfig: (userId: number) => api.get(`/auth/config/${userId}`).then(r => r.data),
};

export const workspaceAPI = {
  create: (data: { name: string; description?: string; owner_id: number }) =>
    api.post('/workspaces/create', data).then(r => r.data),
  getUserWorkspaces: (userId: number) =>
    api.get(`/workspaces/user/${userId}`).then(r => r.data),
  getDetails: (workspaceId: number, _userId: number) =>
    api.get(`/workspaces/${workspaceId}`).then(r => r.data),
  inviteMember: (data: { workspace_id: number; invited_by: number; query: string; role?: string }) =>
    api.post('/workspaces/invite', data).then(r => r.data),
  getPendingInvitations: (userId: number) =>
    api.get(`/workspaces/invitations/${userId}`).then(r => r.data),
  respondToInvitation: (inviteId: number, data: { user_id: number; action: 'accept' | 'reject' }) =>
    api.post(`/workspaces/invitations/${inviteId}/respond`, data).then(r => r.data),
  getWorkspaceInvitations: (workspaceId: number, _userId: number) =>
    api.get(`/workspaces/${workspaceId}/invitations`).then(r => r.data),
  cancelInvitation: (inviteId: number, _userId: number) =>
    api.delete(`/workspaces/invitations/${inviteId}`).then(r => r.data),
  updateRole: (data: { workspace_id: number; actor_id: number; target_user_id: number; new_role: string }) =>
    api.post('/workspaces/update-role', data).then(r => r.data),
  removeMember: (data: { workspace_id: number; actor_id: number; target_user_id: number }) =>
    api.post('/workspaces/remove-member', data).then(r => r.data),
  getActivities: (workspaceId: number) =>
    api.get(`/workspaces/${workspaceId}/activities`).then(r => r.data),
};

export const analysisAPI = {
  run: (data: AnalysisRequest) => api.post('/analysis/run', data).then(r => r.data),
  resolve: (data: ResolveRequest) => api.post('/analysis/resolve', data).then(r => r.data),
  testConnection: (provider: string, apiKey: string, model?: string, userId?: number) =>
    api.post('/analysis/test-connection', { provider, api_key: apiKey, model, user_id: userId }).then(r => r.data),
  getHistory: (userId: number, workspaceId?: number | null) =>
    api.get(`/analysis/history/${userId}`, { params: { workspace_id: workspaceId || undefined } }).then(r => r.data),
  getLatest: (userId: number, workspaceId?: number | null) =>
    api.get(`/analysis/latest/${userId}`, { params: { workspace_id: workspaceId || undefined } }).then(r => r.data),
  getDetails: (analysisId: number, _userId: number, workspaceId?: number | null) =>
    api.get(`/analysis/details/${analysisId}`, { params: { workspace_id: workspaceId || undefined } }).then(r => r.data),
  delete: (analysisId: number, _userId: number) =>
    api.delete(`/analysis/delete/${analysisId}`).then(r => r.data),
  getFileContent: (filePath: string, repoPath?: string) => 
    api.get(`/analysis/file-content`, { params: { file_path: filePath, repo_path: repoPath } }).then(r => r.data),
  getSolutions: (params: { analysis_id?: number; file_path?: string; workspace_id?: number; user_id?: number }) =>
    api.get('/analysis/solutions', { params }).then(r => r.data),
  submitFeedback: (data: { user_id: number; file_path: string; predicted_risk: number; feedback: string; analysis_id?: number }) =>
    api.post('/analysis/feedback', data).then(r => r.data),
};

export const datasetAPI = {
  upload: (formData: FormData) =>
    api.post('/datasets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  list: (workspaceId?: number) =>
    api.get('/datasets/list', { params: { workspace_id: workspaceId } }).then(r => r.data),
  preview: (id: number) =>
    api.get(`/datasets/${id}/preview`).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/datasets/${id}`).then(r => r.data),
};

export const modelAPI = {
  getStatus: () => api.get('/model/status').then(r => r.data),
  getHistory: () => api.get('/model/history').then(r => r.data),
  listModels: () => api.get('/models/list').then(r => r.data),
  train: (data: { model_type: string; dataset_id?: number; test_split?: number; hyperparameters?: any }) =>
    api.post('/models/train', data).then(r => r.data),
  compare: (data?: { dataset_id?: number }) =>
    api.post('/models/compare', data || {}).then(r => r.data),
  setActive: (modelName: string) =>
    api.post('/models/set-active', { model_name: modelName }).then(r => r.data),
  retrain: (triggeredBy = 'admin') =>
    api.post('/model/retrain', null, { params: { triggered_by: triggeredBy } }).then(r => r.data),
};

export const repairAPI = {
  candidate: (data: { file_path: string; source_code: string; risk_cause?: string; analysis_id?: number }) =>
    api.post('/repair/candidate', data).then(r => r.data),
  verifyTests: (data: { file_path: string; candidate_code: string; repo_path?: string }) =>
    api.post('/repair/verify', data).then(r => r.data),
  applyPatch: (data: { file_path: string; candidate_code: string; diff_content: string; test_results?: any; repo_path?: string; analysis_id?: number }) =>
    api.post('/repair/apply', data).then(r => r.data),
  rollback: (patchId: number) =>
    api.post(`/repair/rollback/${patchId}`).then(r => r.data),
  getHistory: (workspaceId?: number) =>
    api.get('/repair/history', { params: { workspace_id: workspaceId } }).then(r => r.data),
};

