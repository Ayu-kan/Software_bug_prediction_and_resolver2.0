import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import type { LlmConfig } from '../store/authStore';
import { authAPI, analysisAPI, modelAPI } from '../services/api';
import {
  KeyRound, CheckCircle2, Loader2, Save, Trash2, ShieldCheck,
  AlertCircle, Zap, Wifi, WifiOff, ChevronDown, Eye, EyeOff,
  BrainCircuit, RefreshCw, History, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Provider = 'openai' | 'gemini' | 'groq';

const PROVIDERS: { id: Provider; label: string; description: string; placeholder: string; color: string; bg: string }[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o · GPT-4 Turbo · GPT-3.5',
    placeholder: 'sk-...',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini 1.5 Pro · Flash · Pro',
    placeholder: 'AIzaSy...',
    color: 'text-blue-400',
    bg: 'bg-blue-500',
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Llama 3 · Mixtral · Ultra-fast',
    placeholder: 'gsk_...',
    color: 'text-purple-400',
    bg: 'bg-purple-500',
  },
];

const MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash-8b'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
};

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.1-8b-instant',
};

const Settings = () => {
  const { user, llmConfig, setLlmConfig } = useAuthStore();

  const [selectedProvider, setSelectedProvider] = useState<Provider>(
    (llmConfig?.provider as Provider) || 'openai'
  );
  const [keys, setKeys] = useState({
    openai: llmConfig?.keys?.openai || '',
    gemini: llmConfig?.keys?.gemini || '',
    groq: llmConfig?.keys?.groq || '',
  });
  const [selectedModel, setSelectedModel] = useState(
    llmConfig?.model || DEFAULT_MODELS[selectedProvider]
  );

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync model when provider changes
  useEffect(() => {
    setSelectedModel(llmConfig?.model || DEFAULT_MODELS[selectedProvider]);
    setTestResult(null);
  }, [selectedProvider]);

  const activeKey = keys[selectedProvider];

  const handleProviderSelect = (p: Provider) => {
    setSelectedProvider(p);
    setTestResult(null);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleTestConnection = async () => {
    if (!activeKey.trim()) {
      setErrorMsg('Enter an API key before testing.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setErrorMsg('');
    try {
      const res = await analysisAPI.testConnection(selectedProvider, activeKey.trim(), selectedModel, user?.id);
      if (res.success) {
        setTestResult({ success: true, message: `Connected successfully via ${selectedProvider} (${selectedModel})` });
      } else {
        setTestResult({ success: false, message: res.error || res.message || 'Connection failed. Please verify the API key.' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data?.detail || err.message || 'Network error. Could not reach the AI provider.';
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeKey.trim()) return;

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await authAPI.updateConfig({
        user_id: user.id,
        provider: selectedProvider,
        api_key: activeKey.trim(),
      });

      if (res.success) {
        const newConfig: LlmConfig = {
          provider: selectedProvider,
          keys: { ...keys, [selectedProvider]: activeKey.trim() },
          model: selectedModel,
        };
        setLlmConfig(newConfig);
        setKeys(newConfig.keys);
        setSuccessMsg(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key saved for active session.`);
      } else {
        setErrorMsg(res.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!user) return;
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await authAPI.updateConfig({ user_id: user.id, provider: selectedProvider, api_key: '' });
      const newKeys = { ...keys, [selectedProvider]: '' };
      setKeys(newKeys);

      // If all keys are now empty, clear llmConfig entirely
      const anyKeyLeft = Object.values(newKeys).some(k => k.trim() !== '');
      setLlmConfig(anyKeyLeft
        ? { provider: selectedProvider, keys: newKeys, model: selectedModel }
        : null
      );
      setTestResult(null);
      setSuccessMsg(`${selectedProvider} API key removed.`);
    } catch {
      setErrorMsg('Failed to clear key.');
    } finally {
      setSaving(false);
    }
  };

  // ---- ML Model Self-Training State ----
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [modelHistory, setModelHistory] = useState<any[]>([]);
  const [retraining, setRetraining] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [retrainResult, setRetrainResult] = useState<any>(null);

  useEffect(() => {
    const loadModelStatus = async () => {
      try {
        const [statusRes, histRes] = await Promise.all([
          modelAPI.getStatus(),
          modelAPI.getHistory(),
        ]);
        if (statusRes.success) setModelStatus(statusRes);
        if (histRes.success) setModelHistory(histRes.history || []);
      } catch { }
    };
    loadModelStatus();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    try {
      const res = await modelAPI.retrain('admin');
      setRetrainResult(res);
      if (res.success) {
        const [statusRes, histRes] = await Promise.all([
          modelAPI.getStatus(),
          modelAPI.getHistory(),
        ]);
        if (statusRes.success) setModelStatus(statusRes);
        if (histRes.success) setModelHistory(histRes.history || []);
      }
    } catch { }
    finally { setRetraining(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-6 pb-10"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
          <KeyRound size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">AI Provider Settings</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure your personal API key for each AI provider. Keys are stored per-session and never shared.
          </p>
        </div>
      </div>

      {/* Overall Status Banner */}
      {llmConfig && Boolean(llmConfig.keys?.[llmConfig.provider]?.trim()) ? (
        <div className="mb-5 p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center space-x-2.5 text-green-400 text-sm">
          <ShieldCheck size={18} className="shrink-0" />
          <span>
            <strong className="capitalize">{llmConfig.provider}</strong> is active for this session
            {llmConfig.model && <span className="text-green-400/80 font-mono text-xs"> ({llmConfig.model})</span>}
          </span>
        </div>
      ) : (
        <div className="mb-5 p-3.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center space-x-2.5 text-yellow-400 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>
            No active AI provider key configured for this session. Enter your API key below to activate AI bug fixes.
          </span>
        </div>
      )}

      {/* Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            key="success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex items-center space-x-2 text-sm"
          >
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center space-x-2 text-sm"
          >
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass rounded-xl border border-border shadow-xl overflow-hidden">
        {/* Provider Tabs */}
        <div className="p-6 border-b border-border/50">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">Select AI Provider</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => {
              const hasProviderKey = Boolean(keys[p.id]?.trim());
              const isSelected = selectedProvider === p.id;
              const isSessionActive = llmConfig?.provider === p.id && Boolean(llmConfig?.keys?.[p.id]?.trim());

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderSelect(p.id)}
                  className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-md shadow-primary/10'
                      : 'bg-secondary/30 border-border hover:bg-secondary/60 hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>{p.label}</p>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        isSessionActive
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : hasProviderKey
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-[#222] text-[#888] border border-[#333]'
                      }`}
                    >
                      {isSessionActive ? 'Active' : hasProviderKey ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{p.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Key Config Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-9 cursor-pointer"
              >
                {MODELS[selectedProvider].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* API Key Input with Show/Hide Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {PROVIDERS.find(p => p.id === selectedProvider)?.label} API Key
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">Encrypted Session Storage</span>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder={PROVIDERS.find(p => p.id === selectedProvider)?.placeholder || ''}
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm pr-11 text-foreground"
                value={activeKey}
                onChange={(e) => {
                  // Sanitize input to strip non-printable/invalid unicode characters
                  const cleanVal = e.target.value.replace(/[^\x20-\x7E]/g, '');
                  setKeys(prev => ({ ...prev, [selectedProvider]: cleanVal }));
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Keys are strictly masked, encrypted, and isolated to your active session. They are never logged or exposed.
            </p>
          </div>

          {/* Test Connection Result */}
          <AnimatePresence>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-start space-x-2 p-3 rounded-lg border text-sm ${
                  testResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}
              >
                {testResult.success
                  ? <Wifi size={16} className="mt-0.5 shrink-0" />
                  : <WifiOff size={16} className="mt-0.5 shrink-0" />
                }
                <span>{testResult.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions Row */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !activeKey.trim()}
                className="px-4 py-2 text-sm bg-secondary/60 hover:bg-secondary border border-border rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-40"
              >
                {testing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                <span>Test Connection</span>
              </button>

              {activeKey.trim() && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  disabled={saving}
                  className="px-3 py-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg flex items-center space-x-1 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Clear Key</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !activeKey.trim()}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center space-x-2 hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>Save API Key</span>
            </button>
          </div>
        </form>

        {/* Per-provider status summary */}
        <div className="px-6 pb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Saved Keys</p>
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map(p => {
              const hasKey = keys[p.id].trim() !== '';
              return (
                <div
                  key={p.id}
                  className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs ${
                    hasKey ? 'border-green-500/20 bg-green-500/5 text-green-400' : 'border-border bg-secondary/20 text-muted-foreground'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-green-400' : 'bg-muted-foreground/40'}`} />
                  <span className="font-medium">{p.label}</span>
                  <span className="opacity-70">{hasKey ? 'Set' : 'None'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- ML Model Intelligence Panel ---- */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#c6f135]/10 flex items-center justify-center">
              <BrainCircuit size={18} className="text-[#c6f135]" />
            </div>
            <div>
              <h2 className="text-base font-semibold">ML Model Intelligence</h2>
              <p className="text-xs text-muted-foreground">Self-improving model that learns from every repository scan and your feedback</p>
            </div>
          </div>

          {modelStatus ? (
            <>
              {/* Active model metrics */}
              {modelStatus.active_model ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Version', value: modelStatus.active_model.version_tag },
                    { label: 'Algorithm', value: modelStatus.active_model.algorithm?.replace('_', ' ') },
                    { label: 'Train Samples', value: modelStatus.active_model.training_samples },
                    { label: 'Precision', value: modelStatus.active_model.precision_score != null ? `${(modelStatus.active_model.precision_score * 100).toFixed(1)}%` : '—' },
                    { label: 'Recall', value: modelStatus.active_model.recall_score != null ? `${(modelStatus.active_model.recall_score * 100).toFixed(1)}%` : '—' },
                    { label: 'PR-AUC', value: modelStatus.active_model.pr_auc != null ? `${(modelStatus.active_model.pr_auc * 100).toFixed(1)}%` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm font-semibold font-mono">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4">
                  No model version recorded yet. Run a repository scan to start collecting training data.
                </div>
              )}

              {/* Sample progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{modelStatus.pending_samples} new samples / {modelStatus.retrain_threshold} needed for auto-retrain</span>
                  <span>{modelStatus.total_labeled} total labeled</span>
                </div>
                <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#c6f135] rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((modelStatus.pending_samples ?? 0) / (modelStatus.retrain_threshold ?? 50)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {modelStatus.user_labeled} user-labeled · {modelStatus.auto_labeled} auto-labeled (from commit history)
                </p>
              </div>

              {/* Retrain button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRetrain}
                  disabled={retraining}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#c6f135]/10 hover:bg-[#c6f135]/20 border border-[#c6f135]/30 text-[#c6f135] text-sm font-medium transition-all disabled:opacity-50"
                >
                  {retraining ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  <span>{retraining ? 'Retraining...' : 'Retrain Now'}</span>
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border text-sm font-medium transition-all"
                >
                  <History size={14} />
                  <span>Model History ({modelHistory.length})</span>
                  <ChevronRight size={12} className={`transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {/* Retrain result */}
              {retrainResult && (
                <div className={`p-3 rounded-xl border text-sm ${
                  retrainResult.success
                    ? 'bg-green-500/5 border-green-500/20 text-green-400'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}>
                  {retrainResult.success
                    ? `✓ Model retrained: ${retrainResult.version_tag} | Best: ${retrainResult.best_model} | PR-AUC: ${((retrainResult.metrics?.pr_auc ?? 0) * 100).toFixed(1)}%`
                    : `✗ ${retrainResult.error}`
                  }
                </div>
              )}

              {/* Model history table */}
              <AnimatePresence>
                {showHistory && modelHistory.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#2a2a2a] bg-[#0d0d0d]">
                            {['Version', 'Algorithm', 'Samples', 'Precision', 'Recall', 'PR-AUC', 'By', 'Date'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modelHistory.map((v: any) => (
                            <tr key={v.id} className={`border-b border-[#1a1a1a] hover:bg-[#141414] transition-colors ${
                              v.is_active ? 'bg-[#c6f135]/5' : ''
                            }`}>
                              <td className="px-3 py-2 font-mono font-semibold text-[#c6f135]">{v.version_tag}{v.is_active ? ' ✓' : ''}</td>
                              <td className="px-3 py-2 capitalize">{v.algorithm?.replace('_', ' ')}</td>
                              <td className="px-3 py-2">{v.training_samples}</td>
                              <td className="px-3 py-2">{v.precision_score != null ? `${(v.precision_score * 100).toFixed(1)}%` : '—'}</td>
                              <td className="px-3 py-2">{v.recall_score != null ? `${(v.recall_score * 100).toFixed(1)}%` : '—'}</td>
                              <td className="px-3 py-2">{v.pr_auc != null ? `${(v.pr_auc * 100).toFixed(1)}%` : '—'}</td>
                              <td className="px-3 py-2 capitalize">{v.triggered_by}</td>
                              <td className="px-3 py-2 text-muted-foreground">{v.created_at?.split('T')[0]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              <span>Loading model status...</span>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};

export default Settings;
