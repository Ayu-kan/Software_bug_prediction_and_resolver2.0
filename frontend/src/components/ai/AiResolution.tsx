import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Loader2, Check, Copy } from 'lucide-react';
import { analysisAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface AiResolutionProps {
  file: any;
  onClose: () => void;
}

const AiResolution: React.FC<AiResolutionProps> = ({ file, onClose }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateSolution = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await analysisAPI.resolve({
        file_path: file.file,
        source_code: file.last_source_code,
        risk_factors: file.risk_cause_description,
        ml_probability: file.ml_probability,
        user_id: user.id,
        row_data: file
      });
      
      if (res.success) {
        setSolution(res.solution);
      } else {
        setError(res.error || 'Failed to generate solution.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (solution) {
      navigator.clipboard.writeText(solution);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-2xl glass z-50 shadow-2xl flex flex-col border-l border-border"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center space-x-2">
          <Sparkles className="text-purple-400" size={20} />
          <h3 className="font-semibold text-lg">AI Issue Resolution</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 flex flex-col">
        <div className="mb-6 p-4 rounded-lg border border-border bg-secondary/20">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Target File</h4>
          <p className="font-mono text-sm break-all">{file.file}</p>
          
          <h4 className="text-sm font-medium text-muted-foreground mt-4 mb-2">Detected Risk Factors</h4>
          <p className="text-sm">{file.risk_cause_description}</p>
        </div>

        {!solution && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Sparkles className="text-muted-foreground mb-4 opacity-50" size={48} />
            <h3 className="text-xl font-semibold mb-2">Generate Auto-Fix</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Use your configured LLM (OpenAI or Gemini) to deeply analyze the source code and generate a patched version addressing the identified risks.
            </p>
            <button
              onClick={generateSolution}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all shadow-lg shadow-purple-900/20"
            >
              <Sparkles size={18} />
              <span>Analyze & Generate Fix</span>
            </button>
            {error && <p className="text-destructive mt-4">{error}</p>}
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-purple-400" size={40} />
            <p className="text-muted-foreground animate-pulse">AI is deeply analyzing code context and formulating a patch...</p>
          </div>
        )}

        {solution && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold flex items-center space-x-2">
                <Check className="text-green-500" size={20} />
                <span>Suggested Resolution</span>
              </h4>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded hover:bg-secondary/50"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
              </button>
            </div>
            
            <div className="flex-1 bg-[#1e1e1e] rounded-lg border border-border p-4 overflow-auto prose prose-invert max-w-none text-sm">
              {/* Simplistic markdown rendering since we didn't install react-markdown */}
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed" style={{ color: '#d4d4d4' }}>
                {solution}
              </pre>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AiResolution;
