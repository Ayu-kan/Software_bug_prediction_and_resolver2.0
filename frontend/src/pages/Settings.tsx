import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { KeyRound, CheckCircle2, Loader2, Save } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = () => {
  const { user } = useAuthStore();
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
        api_key: apiKey
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Configuration saved successfully.');
        setApiKey(''); // Clear for security
      } else {
        setErrorMsg(res.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-10"
    >
      <div className="glass rounded-xl p-8 border border-border shadow-lg">
        <div className="flex items-center space-x-3 mb-6 border-b border-border/50 pb-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <KeyRound size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">LLM Configuration</h2>
            <p className="text-muted-foreground text-sm mt-1">Configure your AI provider for automated issue resolution.</p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg flex items-center space-x-2">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block font-medium mb-2">AI Provider</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`
                flex items-center justify-center p-4 rounded-lg border cursor-pointer transition-all
                ${provider === 'openai' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/30 border-border hover:bg-secondary'}
              `}>
                <input
                  type="radio"
                  className="hidden"
                  name="provider"
                  value="openai"
                  checked={provider === 'openai'}
                  onChange={(e) => setProvider(e.target.value)}
                />
                <span className="font-semibold">OpenAI (GPT-4)</span>
              </label>

              <label className={`
                flex items-center justify-center p-4 rounded-lg border cursor-pointer transition-all
                ${provider === 'gemini' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/30 border-border hover:bg-secondary'}
              `}>
                <input
                  type="radio"
                  className="hidden"
                  name="provider"
                  value="gemini"
                  checked={provider === 'gemini'}
                  onChange={(e) => setProvider(e.target.value)}
                />
                <span className="font-semibold">Google Gemini</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">API Key</label>
            <input
              type="password"
              required
              placeholder="sk-..."
              className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Keys are encrypted and stored securely in the database. 
              Leave blank if you don't want to change your existing key.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading || !apiKey}
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
