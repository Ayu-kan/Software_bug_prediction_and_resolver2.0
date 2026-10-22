import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Loader2, Check, Copy, AlertCircle,
  FileText, CheckCircle, GitCompare, Lock, Settings as SettingsIcon,
  KeyRound, Wrench, RotateCcw, ShieldCheck, FlaskConical,
  Info, CheckCircle2, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analysisAPI, repairAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import CodeDiffView from '../code/CodeDiffView';

interface AiResolutionProps {
  file: any;
  onClose: () => void;
}

type PanelTab = 'repair' | 'assistant';

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

// ── ML Repair Section ────────────────────────────────────────────────────────

const MlRepairSection: React.FC<{ file: any; language: string }> = ({ file, language }) => {
  const [repairState, setRepairState] = useState<
    'idle' | 'generating' | 'generated' | 'verifying' | 'verified' | 'applying' | 'applied' | 'rolling_back'
  >('idle');
  const [candidateResult, setCandidateResult] = useState<any>(null);
  const [verifyResult, setVerifyResult]   = useState<any>(null);
  const [applyResult, setApplyResult]     = useState<any>(null);
  const [repairError, setRepairError]     = useState('');
  const [activeRepairTab, setActiveRepairTab] = useState<'diff' | 'info'>('diff');
  const [copied, setCopied] = useState(false);

  const handleGenerateCandidate = async () => {
    setRepairState('generating');
    setRepairError('');
    setCandidateResult(null);
    setVerifyResult(null);
    setApplyResult(null);
    try {
      const res = await repairAPI.candidate({
        file_path: file.file,
        source_code: file.last_source_code || '',
        risk_cause: file.risk_cause_description || '',
        analysis_id: file.analysis_id,
      });
      if (res.success && res.available) {
        setCandidateResult(res);
        setRepairState('generated');
      } else if (res.success && !res.available) {
        setRepairError(res.message || 'No automated repair pattern matched this defect. Manual review required.');
        setRepairState('idle');
      } else {
        setRepairError(res.error || 'Failed to generate candidate patch.');
        setRepairState('idle');
      }
    } catch (e: any) {
      setRepairError(e.response?.data?.detail || e.message || 'Candidate generation failed.');
      setRepairState('idle');
    }
  };

  const handleVerify = async () => {
    if (!candidateResult) return;
    setRepairState('verifying');
    setRepairError('');
    try {
      const res = await repairAPI.verifyTests({
        file_path: file.file,
        candidate_code: candidateResult.candidate_code,
        repo_path: file.repo_path,
      });
      setVerifyResult(res);
      setRepairState('verified');
    } catch (e: any) {
      setRepairError(e.response?.data?.detail || 'Dry-run verification failed.');
      setRepairState('generated');
    }
  };

  const handleApply = async () => {
    if (!candidateResult) return;
    setRepairState('applying');
    setRepairError('');
    try {
      const res = await repairAPI.applyPatch({
        file_path: file.file,
        candidate_code: candidateResult.candidate_code,
        diff_content: candidateResult.diff || '',
        test_results: verifyResult || undefined,
        repo_path: file.repo_path,
        analysis_id: file.analysis_id,
      });
      if (res.success) {
        setApplyResult(res);
        setRepairState('applied');
      } else {
        setRepairError(res.error || 'Patch apply failed.');
        setRepairState('verified');
      }
    } catch (e: any) {
      setRepairError(e.response?.data?.detail || 'Apply failed.');
      setRepairState('verified');
    }
  };

  const handleRollback = async () => {
    if (!applyResult?.patch_id) return;
    setRepairState('rolling_back');
    setRepairError('');
    try {
      const res = await repairAPI.rollback(applyResult.patch_id);
      if (res.success) {
        setRepairState('idle');
        setCandidateResult(null);
        setVerifyResult(null);
        setApplyResult(null);
      } else {
        setRepairError(res.error || 'Rollback failed.');
        setRepairState('applied');
      }
    } catch (e: any) {
      setRepairError(e.response?.data?.detail || 'Rollback failed.');
      setRepairState('applied');
    }
  };

  const handleCopy = () => {
    if (candidateResult?.candidate_code) {
      navigator.clipboard.writeText(candidateResult.candidate_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Policy Banner */}
      <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#c6f135]/5 border border-[#c6f135]/20 text-xs">
        <Info size={14} className="text-[#c6f135] mt-0.5 shrink-0" />
        <p className="text-[#a0a0a0] leading-relaxed">
          <span className="text-[#c6f135] font-bold">ML Repair Engine — </span>
          Only genuine AST & pattern-guided transformations are applied. If no verified repair exists,
          it will be reported as unavailable. All patches require your explicit approval before disk writes.
        </p>
      </div>

      {repairError && (
        <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
          <XCircle size={14} className="shrink-0 mt-0.5" />
          <span>{repairError}</span>
        </div>
      )}

      {repairState === 'idle' && (
        <div className="py-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#c6f135]/10 text-[#c6f135] flex items-center justify-center border border-[#c6f135]/20">
            <Wrench size={22} />
          </div>
          <div>
            <h4 className="font-bold text-base text-white">Generate Repair Candidate</h4>
            <p className="text-xs text-[#a0a0a0] mt-1 max-w-sm mx-auto">
              Inspects source code via AST + defect pattern rules and produces a verified candidate diff.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateCandidate}
            className="px-6 py-2.5 bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] rounded-xl text-xs font-bold flex items-center space-x-2 mx-auto transition-all shadow-[0_0_12px_rgba(198,241,53,0.2)]"
          >
            <Wrench size={14} />
            <span>Generate Repair Candidate</span>
          </button>
        </div>
      )}

      {repairState === 'generating' && (
        <div className="py-12 flex flex-col items-center space-y-3 text-[#a0a0a0] text-xs">
          <Loader2 size={28} className="animate-spin text-[#c6f135]" />
          <p>Analyzing AST and matching defect repair patterns…</p>
        </div>
      )}

      {(repairState === 'generated' || repairState === 'verifying' || repairState === 'verified') && candidateResult && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(candidateResult.transformations || []).map((t: string, i: number) => (
              <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-[#c6f135]/10 text-[#c6f135] border border-[#c6f135]/20 font-mono">
                ✓ {t}
              </span>
            ))}
          </div>

          <div className="flex space-x-1 border-b border-[#2a2a2a] pb-2">
            {(['diff', 'info'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveRepairTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${activeRepairTab === tab ? 'bg-[#c6f135]/15 text-[#c6f135] border border-[#c6f135]/25' : 'text-[#a0a0a0] hover:bg-[#1a1a1a]'}`}
              >
                {tab === 'diff' ? <><GitCompare size={13} /><span>Side-by-Side Diff</span></> : <><FileText size={13} /><span>Risk Context</span></>}
              </button>
            ))}
          </div>

          {activeRepairTab === 'diff' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#a0a0a0]">Original → Repaired</span>
                <button type="button" onClick={handleCopy} className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs flex items-center space-x-1 text-[#a0a0a0] hover:text-white transition-colors">
                  {copied ? <Check size={11} className="text-[#c6f135]" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied' : 'Copy Patch'}</span>
                </button>
              </div>
              <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
                <CodeDiffView
                  originalCode={file.last_source_code || '// Original source unavailable'}
                  modifiedCode={candidateResult.candidate_code || ''}
                  language={language}
                />
              </div>
            </div>
          )}

          {activeRepairTab === 'info' && (
            <div className="p-4 bg-[#121212] rounded-xl border border-[#2a2a2a] text-xs text-[#a0a0a0] leading-relaxed">
              <p className="font-bold text-white mb-1">Risk Cause Analysis</p>
              <p>{file.risk_cause_description || 'No risk cause recorded.'}</p>
            </div>
          )}

          {verifyResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
              verifyResult.syntax_valid
                ? 'bg-green-500/10 border-green-500/25 text-green-300'
                : 'bg-red-500/10 border-red-500/25 text-red-300'
            }`}>
              {verifyResult.syntax_valid
                ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                : <XCircle size={14} className="shrink-0 mt-0.5" />}
              <div className="space-y-1">
                <p className="font-bold">{verifyResult.syntax_valid ? 'Dry-run passed — safe to apply' : 'Dry-run failed — do NOT apply'}</p>
                {(verifyResult.checks_passed || []).map((c: string, i: number) => <p key={i} className="opacity-80">✓ {c}</p>)}
                {verifyResult.error && <p className="text-red-300">{verifyResult.error}</p>}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {repairState === 'generated' && (
              <button type="button" onClick={handleVerify} className="flex items-center space-x-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold transition-colors">
                <FlaskConical size={13} /><span>Run Dry-Run Verification</span>
              </button>
            )}
            {repairState === 'verifying' && (
              <div className="flex items-center space-x-2 text-xs text-[#a0a0a0]">
                <Loader2 size={13} className="animate-spin" /><span>Running syntax verification…</span>
              </div>
            )}
            {repairState === 'verified' && verifyResult?.syntax_valid && (
              <button type="button" onClick={handleApply} className="flex items-center space-x-2 px-5 py-2 bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] rounded-xl text-xs font-bold transition-all">
                <CheckCircle size={13} /><span>Apply Patch to Disk</span>
              </button>
            )}
            {repairState === 'verified' && !verifyResult?.syntax_valid && (
              <div className="text-xs text-red-400 flex items-center space-x-1.5">
                <XCircle size={13} /><span>Cannot apply — syntax verification failed</span>
              </div>
            )}
            <button type="button" onClick={handleGenerateCandidate} className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#a0a0a0] hover:text-white rounded-xl text-xs transition-colors">
              <Wrench size={12} /><span>Regenerate</span>
            </button>
          </div>
        </div>
      )}

      {repairState === 'applying' && (
        <div className="py-10 flex flex-col items-center space-y-3 text-[#a0a0a0] text-xs">
          <Loader2 size={24} className="animate-spin text-[#c6f135]" />
          <p>Creating backup and writing patch to disk…</p>
        </div>
      )}

      {repairState === 'applied' && applyResult && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/25 flex items-start space-x-3">
            <ShieldCheck size={18} className="text-green-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-green-300 text-sm">Patch Applied Successfully</p>
              <p className="text-[#a0a0a0]">{applyResult.message}</p>
              <p className="text-[#777] font-mono text-[10px]">Backup: {applyResult.backup_file}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRollback}
            className="flex items-center space-x-2 px-4 py-2.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 rounded-xl text-xs font-bold transition-colors"
          >
            {repairState === 'rolling_back' as any
              ? <Loader2 size={13} className="animate-spin" />
              : <RotateCcw size={13} />}
            <span>1-Click Rollback</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ── LLM Assistant Section ─────────────────────────────────────────────────────

const LlmAssistantSection: React.FC<{ file: any; language: string }> = ({ file, language }) => {
  const { user, llmConfig, getActiveApiKey, activeWorkspace, getCurrentRole } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading]           = useState(false);
  const [solutionData, setSolutionData] = useState<SolutionDetails | string | null>(null);
  const [error, setError]               = useState('');
  const [copied, setCopied]             = useState(false);
  const [activeTab, setActiveTab]       = useState<'diff' | 'fix' | 'summary'>('diff');

  const activeKey = getActiveApiKey();
  const hasApiKey = Boolean(activeKey);
  const userRole  = getCurrentRole();
  const isViewer  = userRole === 'viewer';

  const generateSolution = async () => {
    if (!user || !hasApiKey || isViewer) return;
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
        row_data: file,
      });
      if (res.success && res.solution) {
        setSolutionData(res.solution);
      } else if (res.error === 'api_key_required') {
        setError(`No API key configured for ${llmConfig?.provider?.toUpperCase() || 'AI'}. Please save your key in Settings.`);
      } else {
        setError(sanitizeErrorMessage(res.message || res.error || 'Failed to generate explanation.'));
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err.response?.data?.message || err.response?.data?.error || err.response?.data?.detail || err));
    } finally {
      setLoading(false);
    }
  };

  const getSolutionContent = (): SolutionDetails => {
    if (!solutionData) return {};
    if (typeof solutionData === 'string') return { improved_code: solutionData, suggested_fix: 'AI Generated Fix', problem_summary: `Risk: ${(file.ml_probability * 100).toFixed(1)}%` };
    return solutionData;
  };

  const parsed = getSolutionContent();

  const handleCopy = () => {
    const text = parsed.improved_code || (typeof solutionData === 'string' ? solutionData : '');
    if (text) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-purple-500/8 border border-purple-500/20 text-xs">
        <Info size={14} className="text-purple-400 mt-0.5 shrink-0" />
        <p className="text-[#a0a0a0] leading-relaxed">
          <span className="text-purple-300 font-bold">Optional LLM Assistant — </span>
          Uses your configured AI provider to explain defects and suggest manual edits.
          This does <em>not</em> replace the ML prediction engine and never writes to your files directly.
        </p>
      </div>

      {!hasApiKey && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-yellow-400 font-bold text-sm"><KeyRound size={16} /><span>Personal API Key Required</span></div>
          <p className="text-xs text-[#a0a0a0]">Configure your API key in Settings to use the LLM explanation assistant.</p>
          <button type="button" onClick={() => { navigate('/settings'); }} className="mt-2 px-3.5 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
            <SettingsIcon size={13} /><span>Open Settings</span>
          </button>
        </div>
      )}
      {isViewer && (
        <div className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center space-x-2 text-xs text-[#a0a0a0]">
          <Lock size={14} /><span>Viewer role — generating AI explanations is restricted to Editors and Admins.</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl text-xs flex items-start space-x-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {solutionData ? (
        <div className="space-y-4">
          <div className="flex space-x-1 border-b border-[#2a2a2a] pb-2">
            {(['diff', 'fix', 'summary'] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${activeTab === tab ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-[#a0a0a0] hover:bg-[#1a1a1a]'}`}>
                {tab === 'diff' && <><GitCompare size={12} /><span>Diff View</span></>}
                {tab === 'fix'  && <><CheckCircle size={12} /><span>Suggested Fix</span></>}
                {tab === 'summary' && <><FileText size={12} /><span>Issue Summary</span></>}
              </button>
            ))}
          </div>
          {activeTab === 'diff' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#a0a0a0]">Original vs LLM Suggestion</span>
                <button type="button" onClick={handleCopy} className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs flex items-center space-x-1 text-[#a0a0a0]">
                  {copied ? <Check size={11} className="text-[#c6f135]" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
                <CodeDiffView originalCode={file.last_source_code || '// Original source unavailable'} modifiedCode={parsed.improved_code || ''} language={language} />
              </div>
            </div>
          )}
          {activeTab === 'fix' && (
            <div className="space-y-3">
              <div className="p-4 bg-[#121212] rounded-xl border border-[#2a2a2a] text-xs leading-relaxed text-[#d0d0d0] whitespace-pre-wrap">{parsed.suggested_fix || 'No fix explanation.'}</div>
              {parsed.possible_side_effects && (
                <div className="p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/20 text-xs leading-relaxed text-[#a0a0a0]">
                  <p className="font-bold text-yellow-400 mb-1">⚠ Potential Side Effects</p>
                  {parsed.possible_side_effects}
                </div>
              )}
            </div>
          )}
          {activeTab === 'summary' && (
            <div className="p-4 bg-[#121212] rounded-xl border border-[#2a2a2a] text-xs leading-relaxed text-[#d0d0d0] whitespace-pre-wrap">{parsed.problem_summary || file.risk_cause_description}</div>
          )}
          <button type="button" onClick={generateSolution} disabled={loading || !hasApiKey || isViewer}
            className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>Regenerate Explanation</span>
          </button>
        </div>
      ) : (
        <div className="py-12 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Sparkles size={22} />
          </div>
          <div>
            <h4 className="font-bold text-base text-white">LLM Code Assistant</h4>
            <p className="text-xs text-[#a0a0a0] mt-1 max-w-sm mx-auto">
              Ask <strong className="text-white capitalize">{llmConfig?.provider || 'your configured AI'}</strong> to explain defects, suggest manual fixes, and document the risk.
            </p>
          </div>
          <button type="button" onClick={generateSolution} disabled={loading || !hasApiKey || isViewer}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center space-x-2 mx-auto transition-all shadow-md shadow-purple-900/30 disabled:opacity-40">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            <span>{loading ? 'Consulting AI…' : 'Explain with AI'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main Dual-Mode Panel ──────────────────────────────────────────────────────

const AiResolution: React.FC<AiResolutionProps> = ({ file, onClose }) => {
  const { llmConfig } = useAuthStore();
  const [activePanel, setActivePanel] = useState<PanelTab>('repair');

  const ext = file.file?.split('.').pop()?.toLowerCase();
  let language = 'javascript';
  if (ext === 'py')   language = 'python';
  else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
  else if (ext === 'java') language = 'java';
  else if (ext === 'cpp' || ext === 'h')  language = 'cpp';

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-4xl z-50 shadow-2xl flex flex-col border-l border-[#2a2a2a] bg-[#0d0d0d]/98 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] bg-[#121212]">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-[#c6f135]/10 rounded-lg text-[#c6f135] border border-[#c6f135]/20">
            <Wrench size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white">Repair &amp; Assistant Hub</h3>
            <p className="text-[11px] text-[#777] font-mono truncate">{file.file}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 hover:bg-[#1a1a1a] rounded-full text-[#a0a0a0] hover:text-white transition-colors ml-3 cursor-pointer">
          <X size={17} />
        </button>
      </div>

      {/* Risk chip */}
      <div className="px-5 py-2.5 bg-[#121212] border-b border-[#2a2a2a] flex items-center space-x-3 text-xs">
        <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] ${
          (file.ml_probability || 0) >= 0.75
            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
            : (file.ml_probability || 0) >= 0.50
            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            : 'bg-[#c6f135]/10 text-[#c6f135] border border-[#c6f135]/20'
        }`}>
          ML Risk: {((file.ml_probability || 0) * 100).toFixed(1)}%
        </span>
        {file.risk_cause_description && (
          <span className="text-[#777] truncate">{file.risk_cause_description.split(' | ')[0]}</span>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-[#2a2a2a] bg-[#121212]">
        <button
          type="button"
          onClick={() => setActivePanel('repair')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activePanel === 'repair' ? 'border-[#c6f135] text-[#c6f135]' : 'border-transparent text-[#a0a0a0] hover:text-white'
          }`}
        >
          <Wrench size={14} /><span>ML Repair Engine</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePanel('assistant')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activePanel === 'assistant' ? 'border-purple-400 text-purple-300' : 'border-transparent text-[#a0a0a0] hover:text-white'
          }`}
        >
          <Sparkles size={14} /><span>LLM Assistant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono capitalize">
            {llmConfig?.provider || 'AI'}
          </span>
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {activePanel === 'repair' ? (
            <motion.div key="repair" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MlRepairSection file={file} language={language} />
            </motion.div>
          ) : (
            <motion.div key="assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LlmAssistantSection file={file} language={language} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AiResolution;
