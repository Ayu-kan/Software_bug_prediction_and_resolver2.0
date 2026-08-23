import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History as HistoryIcon, ArrowRight, Loader2, FolderGit2,
  Calendar, Sparkles, Filter, Search,
  ChevronRight, X, Trash2, ExternalLink, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAnalysisStore } from '../store/analysisStore';
import { analysisAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface HistoryItem {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  repo_name: string;
  repo_url?: string;
  total_files: number;
  high_risk_count: number;
  analysis_mode: string;
  created_at: string;
  creator_name?: string;
  full_results_json?: any;
  bug_types_detected?: string[];
  suggested_fixes_count?: number;
}

export const History: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeWorkspace } = useAuthStore();
  const { setCurrentAnalysis } = useAnalysisStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepoFilter, setSelectedRepoFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRun, setSelectedRun] = useState<HistoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchHistory = () => {
    if (user?.id) {
      setLoading(true);
      analysisAPI.getHistory(user.id, activeWorkspace?.id).then((res) => {
        if (res.success && Array.isArray(res.history)) {
          const formatted = res.history.map((h: any) => {
            let parsedJson = h.full_results_json;
            if (typeof parsedJson === 'string') {
              try {
                parsedJson = JSON.parse(parsedJson);
              } catch {
                parsedJson = null;
              }
            }

            // Extract tags if present
            const files = Array.isArray(parsedJson)
              ? parsedJson
              : (parsedJson?.all_ranked_files || parsedJson?.hybrid_mode_files || []);

            const tagsSet = new Set<string>();
            files.forEach((f: any) => {
              const desc = f.risk_cause_description || '';
              if (desc.includes('complexity')) tagsSet.add('High Complexity');
              if (desc.includes('churn')) tagsSet.add('High Code Churn');
              if (desc.includes('Auth') || desc.includes('Security')) tagsSet.add('Security/Auth');
              if (desc.includes('Database')) tagsSet.add('Database Risk');
              if (desc.includes('coupling') || desc.includes('Fan-in')) tagsSet.add('Coupling');
              if (desc.includes('Historical')) tagsSet.add('Bug Prone');
            });

            return {
              ...h,
              full_results_json: parsedJson,
              bug_types_detected: Array.from(tagsSet).slice(0, 3)
            };
          });
          setHistory(formatted);
        } else {
          setHistory([]);
        }
        setLoading(false);
      }).catch(() => {
        setHistory([]);
        setLoading(false);
      });
    } else {
      setHistory([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id, activeWorkspace?.id]);

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    setDeletingId(id);
    try {
      const res = await analysisAPI.delete(id, user.id);
      if (res.success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (selectedRun?.id === id) {
          setSelectedRun(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete analysis:', err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleLoadIntoActiveView = (run: HistoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (run.full_results_json) {
      const payload = {
        ...run.full_results_json,
        analysis_id: run.id,
        repo_name: run.repo_name,
        total_files: run.total_files,
        high_risk_count: run.high_risk_count,
        workspace_id: run.workspace_id
      };
      setCurrentAnalysis(payload);
      navigate('/analysis');
    }
  };

  // Extract unique repo names for filtering
  const uniqueRepos = useMemo(() => {
    const repos = new Set<string>();
    history.forEach(item => {
      if (item.repo_name) repos.add(item.repo_name);
    });
    return Array.from(repos);
  }, [history]);

  // Filtered History list
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesRepo = selectedRepoFilter === 'all' || item.repo_name === selectedRepoFilter;
      const matchesSearch = searchQuery.trim() === '' ||
        item.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.analysis_mode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.creator_name && item.creator_name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesRepo && matchesSearch;
    });
  }, [history, selectedRepoFilter, searchQuery]);

  // Get files list from selected run
  const selectedRunFiles = useMemo(() => {
    if (!selectedRun || !selectedRun.full_results_json) return [];
    if (Array.isArray(selectedRun.full_results_json)) {
      return selectedRun.full_results_json;
    }
    return selectedRun.full_results_json.all_ranked_files ||
      selectedRun.full_results_json.hybrid_mode_files ||
      selectedRun.full_results_json.top_10_files ||
      [];
  }, [selectedRun]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#c6f135]/15 text-[#c6f135] text-[10px] font-mono font-bold uppercase border border-[#c6f135]/30">
              {activeWorkspace ? `Workspace · ${activeWorkspace.name}` : 'Personal Workspace'}
            </span>
            <span className="text-xs font-mono text-[#a0a0a0]">Historical Audit Archive</span>
          </div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white">
            REPOSITORY ANALYSIS HISTORY
          </h1>
          <p className="text-sm text-[#a0a0a0] mt-1">
            Complete historical audit runs, defect classifications, and generated AI remediation patches.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/analysis')}
          className="px-5 py-2.5 rounded-xl bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold text-xs flex items-center space-x-2 transition-all shadow-[0_0_15px_rgba(198,241,53,0.25)] shrink-0 w-fit cursor-pointer"
        >
          <Sparkles size={14} />
          <span>New Analysis Run</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Repo Dropdown Filter */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#a0a0a0] shrink-0">
            <Filter size={14} className="text-[#c6f135]" />
            <span>Filter by Repository:</span>
          </div>
          <select
            value={selectedRepoFilter}
            onChange={(e) => setSelectedRepoFilter(e.target.value)}
            className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#c6f135] transition-colors cursor-pointer w-full sm:w-64"
          >
            <option value="all">All Repositories ({history.length})</option>
            {uniqueRepos.map((repo) => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-3 text-[#777]" />
          <input
            type="text"
            placeholder="Search past scans or modes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#c6f135] transition-colors"
          />
        </div>
      </div>

      {/* History Records List */}
      {loading ? (
        <div className="py-20 flex items-center justify-center space-x-3 text-xs font-mono text-[#a0a0a0]">
          <Loader2 className="animate-spin text-[#c6f135]" size={20} />
          <span>Loading historical repository analyses...</span>
        </div>
      ) : filteredHistory.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredHistory.map((run) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-[#121212] border border-[#2a2a2a] hover:border-[#c6f135]/40 transition-all glass-card flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center space-x-2 text-white font-bold text-base">
                    <FolderGit2 size={18} className="text-[#c6f135]" />
                    <span>{run.repo_name}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#181818] border border-[#2a2a2a] text-[10px] font-mono text-[#a0a0a0]">
                    {run.analysis_mode}
                  </span>
                  {run.creator_name && activeWorkspace && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono">
                      by {run.creator_name}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#a0a0a0]">
                  <span className="flex items-center space-x-1.5">
                    <Calendar size={13} className="text-[#777]" />
                    <span>{run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : 'Recent'}</span>
                  </span>
                  <span>·</span>
                  <span>Total Files: <strong className="text-white">{run.total_files}</strong></span>
                  <span>·</span>
                  <span>
                    High Risk Defects:{' '}
                    <strong className={run.high_risk_count > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                      {run.high_risk_count}
                    </strong>
                  </span>
                </div>

                {/* Detected Bug Tags Preview */}
                {run.bug_types_detected && run.bug_types_detected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {run.bug_types_detected.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleLoadIntoActiveView(run, e)}
                  title="Load into Active Workspace View"
                  className="px-3 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] text-[#c6f135] border border-[#2a2a2a] hover:border-[#c6f135]/40 font-mono text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Load Active</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRun(run)}
                  className="px-4 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#c6f135] text-white hover:text-[#0a0a0a] border border-[#2a2a2a] hover:border-[#c6f135] font-mono text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <span>Inspect Details</span>
                  <ChevronRight size={14} />
                </button>

                {confirmDeleteId === run.id ? (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={deletingId === run.id}
                      onClick={(e) => handleDelete(run.id, e)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-bold transition-all"
                    >
                      {deletingId === run.id ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="p-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-gray-400 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    title="Delete Scan Record"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(run.id);
                    }}
                    className="p-2 rounded-xl bg-[#1a1a1a] hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#2a2a2a] hover:border-red-500/30 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-4 rounded-2xl bg-[#121212] border border-[#2a2a2a]">
          <div className="w-12 h-12 rounded-full bg-[#c6f135]/10 text-[#c6f135] flex items-center justify-center mx-auto border border-[#c6f135]/20">
            <HistoryIcon size={24} />
          </div>
          <h3 className="text-lg font-bold text-white">No Matching History Found</h3>
          <p className="text-xs text-[#a0a0a0] max-w-sm mx-auto">
            {selectedRepoFilter !== 'all'
              ? `No previous audit scans found for repository "${selectedRepoFilter}".`
              : 'You have not executed any repository risk analyses in this workspace yet.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/analysis')}
            className="px-5 py-2.5 rounded-xl bg-[#c6f135] text-[#0a0a0a] font-bold text-xs inline-flex items-center space-x-2"
          >
            <span>Run New Repository Scan</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Analysis Details Drawer Modal */}
      <AnimatePresence>
        {selectedRun && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-3xl bg-[#0d0d0d] border-l border-[#2a2a2a] h-full overflow-y-auto flex flex-col justify-between shadow-2xl p-6 space-y-6"
            >
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#2a2a2a]">
                <div>
                  <span className="text-[10px] font-mono text-[#c6f135] uppercase font-bold">Historical Audit Report</span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedRun.repo_name}</h3>
                  <p className="text-xs text-[#a0a0a0] font-mono mt-0.5">
                    Analyzed {selectedRun.created_at ? formatDistanceToNow(new Date(selectedRun.created_at), { addSuffix: true }) : 'Recently'} · {selectedRun.analysis_mode}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleLoadIntoActiveView(selectedRun)}
                    className="px-3 py-1.5 rounded-lg bg-[#c6f135] text-[#0a0a0a] font-mono text-xs font-bold flex items-center space-x-1.5 shadow-[0_0_12px_rgba(198,241,53,0.25)]"
                  >
                    <ExternalLink size={13} />
                    <span>Open in Analysis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRun(null)}
                    className="p-1.5 rounded-lg bg-[#1a1a1a] text-[#a0a0a0] hover:text-white border border-[#2a2a2a]"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Drawer Body: Metrics & Ranked File Inventory */}
              <div className="space-y-6 flex-1">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#2a2a2a] text-center">
                    <p className="text-[10px] font-mono text-[#a0a0a0] uppercase">Total Files</p>
                    <p className="text-lg font-bold text-white font-mono mt-0.5">{selectedRun.total_files}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#2a2a2a] text-center">
                    <p className="text-[10px] font-mono text-[#a0a0a0] uppercase">High Risk Files</p>
                    <p className="text-lg font-bold text-red-400 font-mono mt-0.5">{selectedRun.high_risk_count}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#2a2a2a] text-center">
                    <p className="text-[10px] font-mono text-[#a0a0a0] uppercase">Suggested Fixes</p>
                    <p className="text-lg font-bold text-[#c6f135] font-mono mt-0.5">
                      {selectedRun.suggested_fixes_count || selectedRun.high_risk_count}
                    </p>
                  </div>
                </div>

                {/* Ranked File Risk Inventory */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold uppercase text-white">Prioritized File Breakdown</h4>
                    <span className="text-[10px] font-mono text-[#a0a0a0]">
                      {selectedRunFiles.length} files analyzed
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {selectedRunFiles.length > 0 ? (
                      selectedRunFiles.map((f: any, idx: number) => {
                        const prob = Math.round((f.ml_probability != null ? f.ml_probability : ((f['risk_%'] || 0) / 100)) * 100);
                        const isHigh = prob >= 75;
                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-xl bg-[#121212] border border-[#2a2a2a] space-y-2 text-xs font-mono"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white truncate max-w-md">{f.file}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isHigh ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              }`}>
                                {prob}% Risk
                              </span>
                            </div>

                            {f.risk_cause_description && (
                              <p className="text-[11px] text-[#a0a0a0] leading-relaxed">
                                <strong className="text-gray-300">Trigger:</strong> {f.risk_cause_description}
                              </p>
                            )}

                            {f.suggested_fix && (
                              <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-[#c6f135] text-[11px]">
                                <strong>Suggested Patch:</strong> {f.suggested_fix}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center border border-[#2a2a2a] rounded-xl bg-[#121212] space-y-2">
                        <AlertTriangle size={18} className="mx-auto text-[#f59e0b]" />
                        <p className="text-xs text-[#a0a0a0] font-mono">No detailed file inventory stored for this record.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedRun(null)}
                  className="px-4 py-2 rounded-xl bg-[#181818] text-gray-300 hover:text-white text-xs font-mono cursor-pointer"
                >
                  Close Archive
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleLoadIntoActiveView(selectedRun);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#c6f135] text-[#0a0a0a] font-bold text-xs flex items-center space-x-1.5 shadow-[0_0_15px_rgba(198,241,53,0.25)] cursor-pointer"
                >
                  <span>Open Full Analysis View</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default History;

