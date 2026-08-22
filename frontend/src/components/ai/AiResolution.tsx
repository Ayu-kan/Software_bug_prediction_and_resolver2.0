import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Sparkles, Loader2, Check, Copy, AlertCircle,
  FileText, CheckCircle, GitCompare, Lock, Settings as SettingsIcon,
  KeyRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analysisAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import CodeDiffView from '../code/CodeDiffView';

interface AiResolutionProps {
  file: any;
  onClose: () => void;
}

export interface SolutionDetails {
  problem_summary?: string;
  suggested_fix?: string;
  improved_code?: string;
  possible_side_effects?: string;
  sanitized_code?: string;
}

const sanitizeErrorMessage = (rawError: any): string => {
  if (!rawError) return 'An unexpected error occurred during AI solution generation.';
  const str = typeof rawError === 'string' ? rawError : (rawError.message || rawError.detail || String(rawError));
  
  if (str.includes('ascii') || str.includes('codec') || str.includes('ordinal not in range') || str.includes('Unicode')) {
    return 'AI resolution failed due to invalid API key formatting or encoding. Please re-enter your API key in Settings.';
  }
  if (str.includes('api_key_required') || str.includes('No API key')) {
    return 'No active API key configured. Please configure your API key in Settings to use AI Auto-Fix.';
  }
  if (str.includes('rate_limit') || str.includes('429')) {
    return 'AI provider rate limit reached. Please wait a moment or select a different model in Settings.';
  }
  if (str.includes('invalid_api_key') || str.includes('Incorrect API key') || str.includes('401')) {
    return 'The configured API key was rejected by the provider. Please verify your key in Settings.';
  }
  if (str.length > 120 && (str.includes('Traceback') || str.includes('File ') || str.includes('Exception'))) {
    return 'AI resolution request encountered a server error. Please verify your API key and connection in Settings.';
  }
  return str;
};

const AiResolution: React.FC<AiResolutionProps> = ({ file, onClose }) => {
  const { user, llmConfig, getActiveApiKey, activeWorkspace, getCurrentRole } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [solutionData, setSolutionData] = useState<SolutionDetails | string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'diff' | 'code' | 'fix' | 'summary'>('diff');

  const activeKey = getActiveApiKey();
  const hasApiKey = Boolean(activeKey);
  const userRole = getCurrentRole();
  const isViewer = userRole === 'viewer';

  const generateSolution = async () => {
    if (!user) return;
    if (!hasApiKey) {
      setError('No API key configured. Please go to Settings to configure your OpenAI, Gemini, or Groq API key.');
      return;
    }
    if (isViewer) {
      setError('You have a Viewer role in this workspace and cannot generate AI fixes.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await analysisAPI.resolve({
        file_path: file.file,
        source_code: file.last_source_code,
        risk_factors: file.risk_cause_description,
        ml_probability: file.ml_probability,
        user_id: user.id,
        workspace_id: activeWorkspace?.id || null,
        analysis_id: file.analysis_id || null,
        row_data: file
      });
      
      if (res.success && res.solution) {
        setSolutionData(res.solution);
      } else if (res.error === 'api_key_required') {
        setError(`No API key configured for ${llmConfig?.provider?.toUpperCase() || 'AI'}. Please save your API key in Settings.`);
      } else {
        setError(sanitizeErrorMessage(res.message || res.error || 'Failed to generate solution.'));
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err.response?.data?.message || err.response?.data?.error || err.response?.data?.detail || err));
    } finally {
      setLoading(false);
    }
  };

  const getSolutionContent = (): SolutionDetails => {
    if (!solutionData) return {};
    if (typeof solutionData === 'string') {
      return {
        improved_code: solutionData,
        suggested_fix: 'AI Generated Fix',
        problem_summary: `Risk Probability: ${(file.ml_probability * 100).toFixed(1)}%`
      };
    }
    return solutionData;
  };

  const parsedSolution = getSolutionContent();

  const handleCopyCode = () => {
    const textToCopy = parsedSolution.improved_code || (typeof solutionData === 'string' ? solutionData : '');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const ext = file.file?.split('.').pop()?.toLowerCase();
  let language = 'javascript';
  if (ext === 'py') language = 'python';
  else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
  else if (ext === 'java') language = 'java';
  else if (ext === 'cpp' || ext === 'h') language = 'cpp';

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-4xl glass z-50 shadow-2xl flex flex-col border-l border-border bg-background/95 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center space-x-3 truncate">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <Sparkles size={20} />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-base truncate">BugRiskIntel AI Resolution</h3>
            <p className="text-xs text-muted-foreground font-mono truncate">{file.file}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Provider Info Banner */}
      <div className="px-5 py-2.5 bg-secondary/20 border-b border-border/30 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-muted-foreground">Provider:</span>
          <span className="font-mono font-bold capitalize text-primary">
            {llmConfig?.provider || 'OpenAI'} {llmConfig?.model ? `(${llmConfig.model})` : ''}
          </span>
          {activeWorkspace && (
            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px]">
              Workspace: {activeWorkspace.name}
            </span>
          )}
        </div>

        {!hasApiKey && (
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/settings');
            }}
            className="flex items-center space-x-1 text-yellow-400 hover:underline font-semibold cursor-pointer"
          >
            <KeyRound size={12} />
            <span>Configure API Key</span>
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Missing API Key Warning */}
        {!hasApiKey && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-yellow-400 font-bold text-sm">
              <KeyRound size={17} />
              <span>Personal API Key Required</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To generate automated bug fixes and code refactoring, please configure your personal API key in Settings. Your key is stored securely with encryption.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/settings');
              }}
              className="mt-2 px-3.5 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <SettingsIcon size={14} />
              <span>Open Settings to Add API Key</span>
            </button>
          </div>
        )}

        {/* Viewer Role Warning */}
        {isViewer && (
          <div className="p-3 bg-secondary border border-border rounded-xl flex items-center space-x-2 text-xs text-muted-foreground">
            <Lock size={16} />
            <span>You have a Viewer role in this workspace. Generating new AI fixes is restricted to Editors and Admins.</span>
          </div>
        )}

        {/* Sanitized User-Friendly Error Alert */}
        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl text-xs flex items-start space-x-2.5 leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Solution Content */}
        {solutionData ? (
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex space-x-1 border-b border-border/50 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('diff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'diff' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <GitCompare size={14} />
                <span>Side-by-Side Diff</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'fix' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <CheckCircle size={14} />
                <span>Suggested Fix</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'summary' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <FileText size={14} />
                <span>Issue Summary</span>
              </button>
            </div>

            {/* Tab: Diff */}
            {activeTab === 'diff' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Original vs AI Improved Code</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Fixed Code'}</span>
                  </button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden shadow-inner">
                  <CodeDiffView
                    originalCode={file.last_source_code || '// Original source unavailable'}
                    modifiedCode={parsedSolution.improved_code || '// AI modified code'}
                    language={language}
                  />
                </div>
              </div>
            )}

            {/* Tab: Fix */}
            {activeTab === 'fix' && (
              <div className="space-y-4">
                <div className="glass p-5 rounded-xl border border-border space-y-2">
                  <h4 className="font-bold text-sm text-foreground">Remediation Plan</h4>
                  <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {parsedSolution.suggested_fix || 'No specific fix explanation available.'}
                  </div>
                </div>

                {parsedSolution.possible_side_effects && (
                  <div className="glass p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-2">
                    <h4 className="font-bold text-sm text-yellow-400">Potential Side Effects to Watch</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {parsedSolution.possible_side_effects}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Summary */}
            {activeTab === 'summary' && (
              <div className="glass p-5 rounded-xl border border-border space-y-3">
                <h4 className="font-bold text-sm text-foreground">Defect & Root Cause Analysis</h4>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {parsedSolution.problem_summary || file.risk_cause_description}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
              <Sparkles size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-lg text-foreground">Generate AI Auto-Fix</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Generate root-cause explanations, targeted patches, and side-by-side diffs using{' '}
                <strong className="capitalize">{llmConfig?.provider || 'AI'}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={generateSolution}
              disabled={loading || !hasApiKey || isViewer}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center space-x-2 mx-auto transition-all shadow-md shadow-purple-900/30 disabled:opacity-40 cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{loading ? 'Consulting LLM Engine...' : 'Generate Auto-Fix Now'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {solutionData && (
        <div className="p-4 border-t border-border/50 bg-secondary/30 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-mono">
            BugRiskIntel · {llmConfig?.provider?.toUpperCase() || 'AI'}
          </span>
          <button
            type="button"
            onClick={generateSolution}
            disabled={loading || !hasApiKey || isViewer}
            className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Regenerate Solution</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default AiResolution;
