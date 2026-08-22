import axios from 'axios';
import type {
  RegisterRequest, LoginRequest, ConfigRequest, AnalysisRequest, ResolveRequest
} from '../types';

const API_BASE = 'http://localhost:8000'; // FastAPI dev server

const api = axios.create({
  baseURL: API_BASE,
});

export const authAPI = {
  register: (data: RegisterRequest) => api.post('/auth/register', data).then(r => r.data),
  login: (data: LoginRequest) => api.post('/auth/login', data).then(r => r.data),
  updateConfig: (data: ConfigRequest) => api.post('/auth/config', data).then(r => r.data),
  getConfig: (userId: number) => api.get(`/auth/config/${userId}`).then(r => r.data),
};

export const workspaceAPI = {
  create: (data: { name: string; description?: string; owner_id: number }) =>
    api.post('/workspaces/create', data).then(r => r.data),
  getUserWorkspaces: (userId: number) =>
    api.get(`/workspaces/user/${userId}`).then(r => r.data),
  getDetails: (workspaceId: number, userId: number) =>
    api.get(`/workspaces/${workspaceId}`, { params: { user_id: userId } }).then(r => r.data),
  inviteMember: (data: { workspace_id: number; invited_by: number; query: string; role?: string }) =>
    api.post('/workspaces/invite', data).then(r => r.data),
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
  testConnection: (provider: string, apiKey: string, model?: string) =>
    api.post('/analysis/test-connection', { provider, api_key: apiKey, model }).then(r => r.data),
  getHistory: (userId: number, workspaceId?: number | null) =>
    api.get(`/analysis/history/${userId}`, { params: { workspace_id: workspaceId || undefined } }).then(r => r.data),
  getLatest: (userId: number, workspaceId?: number | null) =>
    api.get(`/analysis/latest/${userId}`, { params: { workspace_id: workspaceId || undefined } }).then(r => r.data),
  getDetails: (analysisId: number, userId: number, workspaceId?: number | null) =>
    api.get(`/analysis/details/${analysisId}`, { params: { user_id: userId, workspace_id: workspaceId || undefined } }).then(r => r.data),
  delete: (analysisId: number, userId: number) =>
    api.delete(`/analysis/delete/${analysisId}`, { params: { user_id: userId } }).then(r => r.data),
  getFileContent: (filePath: string, repoPath?: string) => 
    api.get(`/analysis/file-content`, { params: { file_path: filePath, repo_path: repoPath } }).then(r => r.data),
  getSolutions: (params: { analysis_id?: number; file_path?: string; workspace_id?: number; user_id?: number }) =>
    api.get('/analysis/solutions', { params }).then(r => r.data),
};
