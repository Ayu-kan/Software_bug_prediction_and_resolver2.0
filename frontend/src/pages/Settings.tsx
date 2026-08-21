import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import type { LlmConfig } from '../store/authStore';
import { authAPI, analysisAPI } from '../services/api';
import {
  KeyRound, CheckCircle2, Loader2, Save, Trash2, ShieldCheck,
  AlertCircle, Zap, Wifi, WifiOff, ChevronDown
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
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-1.5-pro', 'gemini-pro', 'gemini-1.5-flash'],
  groq: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
};

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
  groq: 'llama3-8b-8192',
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
      const res = await analysisAPI.testConnection(selectedProvider, activeKey.trim(), selectedModel);
      if (res.success) {
        setTestResult({ success: true, message: `Connected successfully via ${selectedProvider} (${selectedModel})` });
      } else {
        setTestResult({ success: false, message: res.error || res.message || 'Connection failed.' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error. Could not reach the AI provider.' });
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
      {llmConfig && (
        <div className="mb-5 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center space-x-2 text-green-400 text-sm">
          <ShieldCheck size={18} />
          <span>
            <strong className="capitalize">{llmConfig.provider}</strong> is active for this session
            {llmConfig.model && <span className="text-green-400/70"> · {llmConfig.model}</span>}
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
          <div className="grid grid-cols-3 gap-3">
            {PROVIDERS.map((p) => {
              const hasKey = keys[p.id].trim() !== '';
              const isActive = selectedProvider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleProviderSelect(p.id)}
                  className={`relative p-4 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-primary/10 border-primary shadow-md shadow-primary/10'
                      : 'bg-secondary/30 border-border hover:bg-secondary/60 hover:border-border/80'
                  }`}
                >
                  {/* Key status dot */}
                  <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${hasKey ? 'bg-green-400' : 'bg-secondary border border-border'}`} title={hasKey ? 'Key configured' : 'No key'} />
                  <p className={`font-bold text-sm ${isActive ? 'text-primary' : 'text-foreground'}`}>{p.label}</p>
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

          {/* API Key Input */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {PROVIDERS.find(p => p.id === selectedProvider)?.label} API Key
            </label>
            <input
              type="password"
              placeholder={PROVIDERS.find(p => p.id === selectedProvider)?.placeholder || ''}
              className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              value={activeKey}
              onChange={(e) => setKeys(prev => ({ ...prev, [selectedProvider]: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              Your key is stored locally in your session and wiped on logout. It is never sent to our servers for any purpose other than routing your AI request.
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
      </div>
    </motion.div>
  );
};

export default Settings;
