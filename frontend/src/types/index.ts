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
  all_keys?: Record<string, string>;
}

export interface AnalysisRequest {
  repo_path: string;
  user_id: number;
  workspace_id?: number | null;
  analysis_mode?: string;
}

export interface ResolveRequest {
  file_path: string;
  source_code?: string;
  risk_factors?: string;
  ml_probability: number;
  user_id: number;
  workspace_id?: number | null;
  analysis_id?: number | null;
  row_data?: Record<string, any>;
}

export interface User {
  id: number;
  username: string;
  email?: string;
}

export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  username: string;
  email?: string;
  role: WorkspaceRole;
  joined_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  role?: WorkspaceRole;
  invite_code?: string;
  created_at: string;
  member_count?: number;
  analysis_count?: number;
  members?: WorkspaceMember[];
  activities?: ActivityLog[];
}

export interface ActivityLog {
  id: number;
  workspace_id: number;
  user_id: number;
  username: string;
  action_type: string;
  description: string;
  created_at: string;
}

export interface HistoryItem {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  repo_name: string;
  total_files: number;
  high_risk_count: number;
  analysis_mode: string;
  created_at: string;
  creator_name?: string;
}

export interface AiSolutionRecord {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  analysis_id?: number | null;
  file_path: string;
  generated_solution: any;
  created_at: string;
  username?: string;
}
