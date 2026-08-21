import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Loader2, Check, Copy, AlertCircle, ShieldAlert, Code2, FileText, CheckCircle, GitCompare } from 'lucide-react';
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

const AiResolution: React.FC<AiResolutionProps> = ({ file, onClose }) => {
  const { user, llmConfig } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [solutionData, setSolutionData] = useState<SolutionDetails | string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'diff' | 'code' | 'fix' | 'summary'>('diff');

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
      
      if (res.success && res.solution) {
        setSolutionData(res.solution);
      } else {
        setError(res.error || 'Failed to generate solution.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An unexpected error occurred during solution generation.');
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

  // Determine language for syntax highlighting
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
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-none">AI Bug Resolution & Code Diff</h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-md">{file.file}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-6">
        
        {/* Risk Context Header Card */}
        <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
              <ShieldAlert size={14} className="text-destructive" />
              <span>Detected Risk Factors</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/20">
              {(file.ml_probability * 100).toFixed(1)}% Risk
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{file.risk_cause_description}</p>
        </div>

        {/* Initial Prompt */}
        {!solutionData && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-secondary/10">
            <div className="p-4 bg-purple-500/10 rounded-full text-purple-400 mb-4 border border-purple-500/20">
              <Sparkles size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">Generate AI Refactored Fix</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
              Use {llmConfig?.provider || 'AI'} to generate a patch addressing high complexity, security risks, and bug-prone AST patterns.
            </p>

            <button
              onClick={generateSolution}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-purple-900/30 hover:scale-105"
            >
              <Sparkles size={18} />
              <span>Analyze & Generate Code Fix</span>
            </button>

            {error && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-16">
            <Loader2 className="animate-spin text-purple-400" size={44} />
            <div className="text-center">
              <p className="font-semibold text-lg">Generating Code Patch</p>
              <p className="text-muted-foreground text-sm animate-pulse mt-1">Comparing source code AST and constructing refactored diff...</p>
            </div>
          </div>
        )}

        {/* Solution View Container */}
        {solutionData && !loading && (
          <div className="flex-1 flex flex-col space-y-4 animate-in fade-in duration-300">
            
            {/* View Selector Tabs */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('diff')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'diff' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <GitCompare size={15} />
                  <span>Side-by-Side Diff</span>
                </button>

                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'code' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <Code2 size={15} />
                  <span>Fixed Code</span>
                </button>

                <button
                  onClick={() => setActiveTab('fix')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'fix' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <CheckCircle size={15} />
                  <span>Fix Steps</span>
                </button>

                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'summary' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <FileText size={15} />
                  <span>Summary & Impacts</span>
                </button>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'diff' && (
              <div className="flex-1 h-[450px]">
                <CodeDiffView
                  originalCode={file.last_source_code || ''}
                  modifiedCode={parsedSolution.improved_code || ''}
                  language={language}
                />
              </div>
            )}

            {activeTab === 'code' && (
              <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-border p-4 overflow-auto font-mono text-xs leading-relaxed text-gray-200">
                <pre className="whitespace-pre-wrap">
                  {parsedSolution.improved_code || '// No code snippet returned'}
                </pre>
              </div>
            )}

            {activeTab === 'fix' && (
              <div className="flex-1 bg-secondary/20 rounded-xl border border-border p-6 overflow-auto space-y-4 text-sm">
                <h4 className="font-semibold text-base text-purple-400 flex items-center space-x-2">
                  <CheckCircle size={18} />
                  <span>Recommended Refactoring Steps</span>
                </h4>
                <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {parsedSolution.suggested_fix || 'No detailed fix instructions provided.'}
                </div>
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="flex-1 bg-secondary/20 rounded-xl border border-border p-6 overflow-auto space-y-6 text-sm">
                <div>
                  <h4 className="font-semibold text-base mb-2 text-foreground">Problem Analysis</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {parsedSolution.problem_summary || 'Analysis complete.'}
                  </p>
                </div>
                {parsedSolution.possible_side_effects && (
                  <div className="pt-4 border-t border-border/50">
                    <h4 className="font-semibold text-base mb-2 text-yellow-400">Possible Side Effects & Dependent Modules</h4>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {parsedSolution.possible_side_effects}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default AiResolution;
