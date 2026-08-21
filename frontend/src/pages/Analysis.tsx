import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, FolderSearch, Settings2 } from 'lucide-react';
import { analysisAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useAnalysisStore } from '../store/analysisStore';
import RiskTable from '../components/risk/RiskTable';
import CodePreview from '../components/code/CodePreview';
import AiResolution from '../components/ai/AiResolution';

const Analysis = () => {
  const { user } = useAuthStore();
  const { currentAnalysis, setCurrentAnalysis, isLoading, setLoading } = useAnalysisStore();
  
  const [repoPath, setRepoPath] = useState('');
  const [mode, setMode] = useState('Normal Mode (All Files)');
  const [error, setError] = useState('');
  
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [resolveFile, setResolveFile] = useState<any>(null);

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !repoPath.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const res = await analysisAPI.run({
        repo_path: repoPath.trim(),
        user_id: user.id,
        analysis_mode: mode
      });

      if (res.success) {
        setCurrentAnalysis(res);
      } else {
        setError(res.error || 'Analysis failed to run.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An unexpected error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  };

  const displayFiles = currentAnalysis?.hybrid_mode_files && mode.includes('Hybrid')
    ? currentAnalysis.hybrid_mode_files
    : currentAnalysis?.all_ranked_files || [];

  return (
    <div className="relative h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Repository Analysis</h1>
          <p className="text-muted-foreground mt-2">Run deep static and ML-based analysis on your codebase.</p>
        </header>

        {/* Input Section */}
        <div className="glass rounded-xl p-6 border border-border">
          <form onSubmit={handleRunAnalysis} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                <FolderSearch size={16} />
                <span>Repository Path or GitHub URL</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. C:\Projects\MyRepo OR https://github.com/owner/repo"
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                <Settings2 size={16} />
                <span>Analysis Mode</span>
              </label>
              <select
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="Normal Mode (All Files)">Normal Mode (All Files)</option>
                <option value="Hybrid Mode (Risk > 60%)">Hybrid Mode (Risk &gt; 60%)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading || !repoPath.trim()}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all disabled:opacity-50 w-full md:w-auto h-[46px]"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              <span>{isLoading ? 'Analyzing...' : 'Run Analysis'}</span>
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Loading State Overlay */}
        {isLoading && !currentAnalysis && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="text-lg font-medium animate-pulse">Extracting code features and running ML predictions...</p>
          </div>
        )}

        {/* Results Section */}
        {currentAnalysis && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="glass p-4 rounded-lg border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Files</p>
                  <p className="text-2xl font-bold">{currentAnalysis.total_files}</p>
               </div>
               <div className="glass p-4 rounded-lg border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-1">High Risk</p>
                  <p className="text-2xl font-bold text-destructive">{currentAnalysis.high_risk_count}</p>
               </div>
               <div className="glass p-4 rounded-lg border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-1">Displaying</p>
                  <p className="text-2xl font-bold text-primary">{displayFiles.length}</p>
               </div>
               <div className="glass p-4 rounded-lg border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-1">Repo Name</p>
                  <p className="text-lg font-medium truncate px-2" title={currentAnalysis.repo_name}>{currentAnalysis.repo_name}</p>
               </div>
            </div>

            <div className="pt-4">
              <h2 className="text-xl font-semibold mb-4">Risk Inventory</h2>
              <RiskTable 
                files={displayFiles} 
                onPreview={setPreviewFile}
                onResolve={setResolveFile}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Slide-over Modals */}
      <AnimatePresence>
        {previewFile && (
          <CodePreview 
            file={previewFile} 
            onClose={() => setPreviewFile(null)} 
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {resolveFile && (
          <AiResolution 
            file={resolveFile} 
            onClose={() => setResolveFile(null)} 
          />
        )}
      </AnimatePresence>
      
      {/* Backdrop for modals */}
      <AnimatePresence>
        {(previewFile || resolveFile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => {
              setPreviewFile(null);
              setResolveFile(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Analysis;
