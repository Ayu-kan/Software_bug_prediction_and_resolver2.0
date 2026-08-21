import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { KeyRound, CheckCircle2, Loader2, Save, Trash2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = () => {
  const { user, llmConfig, setLlmConfig } = useAuthStore();
  const [provider, setProvider] = useState(llmConfig?.provider || 'openai');
  const [apiKey, setApiKey] = useState(llmConfig?.apiKey || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (llmConfig) {
      setProvider(llmConfig.provider || 'openai');
      setApiKey(llmConfig.apiKey || '');
    }
  }, [llmConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await authAPI.updateConfig({
        user_id: user.id,
        provider,
        api_key: apiKey.trim()
      });

      if (res.success) {
        setLlmConfig({ provider, apiKey: apiKey.trim() });
        setSuccessMsg(res.message || 'LLM configuration saved for active session.');
      } else {
        setErrorMsg(res.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!user) return;
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await authAPI.updateConfig({
        user_id: user.id,
        provider: 'openai',
        api_key: ''
      });
      setLlmConfig(null);
      setApiKey('');
      setSuccessMsg('API Key and LLM session configuration cleared.');
    } catch (err: any) {
      setErrorMsg('Failed to clear key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-6"
    >
      <div className="glass rounded-xl p-8 border border-border shadow-xl">
        <div className="flex items-center space-x-3 mb-6 border-b border-border/50 pb-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary border border-primary/20">
            <KeyRound size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">LLM API Key & Session Settings</h2>
            <p className="text-muted-foreground text-sm mt-1">Configure your OpenAI or Gemini key for AI issue resolution.</p>
          </div>
        </div>

        {llmConfig?.apiKey && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheck size={20} />
              <div>
                <p className="text-sm font-semibold capitalize">{llmConfig.provider} Key Active</p>
                <p className="text-xs opacity-80">Persisted for current session (Cleared on logout)</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              type="button"
              className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-md flex items-center space-x-1 border border-red-500/30 transition-colors"
            >
              <Trash2 size={14} />
              <span>Clear Key</span>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg flex items-center space-x-2">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block font-medium mb-2 text-sm">AI Provider</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`
                flex items-center justify-center p-4 rounded-lg border cursor-pointer transition-all
                ${provider === 'openai' ? 'bg-primary/15 border-primary text-primary font-semibold' : 'bg-secondary/30 border-border hover:bg-secondary text-muted-foreground'}
              `}>
                <input
                  type="radio"
                  className="hidden"
                  name="provider"
                  value="openai"
                  checked={provider === 'openai'}
                  onChange={(e) => setProvider(e.target.value)}
                />
                <span>OpenAI (GPT-4 / GPT-3.5)</span>
              </label>

              <label className={`
                flex items-center justify-center p-4 rounded-lg border cursor-pointer transition-all
                ${provider === 'gemini' ? 'bg-primary/15 border-primary text-primary font-semibold' : 'bg-secondary/30 border-border hover:bg-secondary text-muted-foreground'}
              `}>
                <input
                  type="radio"
                  className="hidden"
                  name="provider"
                  value="gemini"
                  checked={provider === 'gemini'}
                  onChange={(e) => setProvider(e.target.value)}
                />
                <span>Google Gemini Pro</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2 text-sm">API Key</label>
            <input
              type="password"
              required
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
              className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Keys remain active for your logged-in session across all tabs and are wiped cleanly when you log out.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center space-x-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default Settings;
