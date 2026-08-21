import axios from 'axios';
import type { RegisterRequest, LoginRequest, ConfigRequest, AnalysisRequest, ResolveRequest } from '../types';

const API_BASE = 'http://localhost:8000'; // FastAPI dev server

const api = axios.create({
  baseURL: API_BASE,
});

export const authAPI = {
  register: (data: RegisterRequest) => api.post('/auth/register', data).then(r => r.data),
  login: (data: LoginRequest) => api.post('/auth/login', data).then(r => r.data),
  updateConfig: (data: ConfigRequest) => api.post('/auth/config', data).then(r => r.data),
};

export const analysisAPI = {
  run: (data: AnalysisRequest) => api.post('/analysis/run', data).then(r => r.data),
  resolve: (data: ResolveRequest) => api.post('/analysis/resolve', data).then(r => r.data),
  getHistory: (userId: number) => api.get(`/analysis/history/${userId}`).then(r => r.data),
  getDetails: (analysisId: number, userId: number) => api.get(`/analysis/details/${analysisId}?user_id=${userId}`).then(r => r.data),
  delete: (analysisId: number, userId: number) => api.delete(`/analysis/delete/${analysisId}?user_id=${userId}`).then(r => r.data),
  getFileContent: (filePath: string, repoPath?: string) => 
    api.get(`/analysis/file-content`, { params: { file_path: filePath, repo_path: repoPath } }).then(r => r.data),
};
