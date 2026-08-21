export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ConfigRequest {
  user_id: number;
  provider: string;
  api_key: string;
}

export interface AnalysisRequest {
  repo_path: string;
  user_id: number;
  analysis_mode?: string;
}

export interface ResolveRequest {
  file_path: string;
  source_code?: string;
  risk_factors?: string;
  ml_probability: number;
  user_id: number;
  row_data?: Record<string, any>;
}

export interface User {
  id: number;
  username: string;
  email?: string;
}
