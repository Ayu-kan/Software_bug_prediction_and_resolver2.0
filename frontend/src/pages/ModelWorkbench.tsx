import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BrainCircuit, Play, CheckCircle2, AlertCircle, RefreshCw,
  Trophy, BarChart2, Check, ShieldCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { modelAPI, datasetAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const ModelWorkbench: React.FC = () => {
  const { activeWorkspace } = useAuthStore();
  const [modelData, setModelData] = useState<any | null>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState('random_forest');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | undefined>(undefined);
  const [testSplit, setTestSplit] = useState(0.25);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, dRes] = await Promise.all([
        modelAPI.listModels(),
        datasetAPI.list(activeWorkspace?.id),
      ]);
      if (mRes.success) {
        setModelData(mRes);
        if (mRes.registered_versions?.length) {
          setLeaderboard(mRes.registered_versions.map((v: any) => ({
            name: v.name,
            algorithm: v.algorithm,
            precision: v.metrics?.precision ?? 0,
            recall: v.metrics?.recall ?? 0,
            f1: v.metrics?.f1 ?? 0,
            pr_auc: v.metrics?.pr_auc ?? 0,
            roc_auc: v.metrics?.roc_auc ?? 0,
            top_20pct_recall: v.metrics?.top_20pct_recall ?? 0,
            confusion_matrix: v.metrics?.confusion_matrix,
            version_tag: v.version_tag
          })));
        }
      }
      if (dRes.success && Array.isArray(dRes.datasets)) {
        setDatasets(dRes.datasets);
        if (dRes.datasets.length > 0 && selectedDatasetId === undefined) {
          setSelectedDatasetId(dRes.datasets[0].id);
        }
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to load model registry.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace?.id]);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setTraining(true);
    setMsg(null);
    try {
      const res = await modelAPI.train({
        model_type: selectedAlgo,
        dataset_id: selectedDatasetId,
        test_split: testSplit
      });
      if (res.success) {
        setMsg({
          type: 'success',
          text: `Trained ${res.name} successfully (F1: ${res.metrics.f1}, PR-AUC: ${res.metrics.pr_auc || 'N/A'}).`
        });
        loadData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Training failed.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || err.message || 'Training failed.' });
    } finally {
      setTraining(false);
    }
  };

  const handleCompare = async () => {
    setComparing(true);
    setMsg(null);
    try {
      const res = await modelAPI.compare({ dataset_id: selectedDatasetId });
      if (res.success && Array.isArray(res.leaderboard)) {
        setLeaderboard(res.leaderboard);
        setMsg({ type: 'success', text: `Benchmark comparison completed across ${res.leaderboard.length} models.` });
        loadData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Comparison failed.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || err.message || 'Comparison failed.' });
    } finally {
      setComparing(false);
    }
  };

  const handleSetActive = async (versionOrAlgo: string) => {
    try {
      const res = await modelAPI.setActive(versionOrAlgo);
      if (res.success) {
        setMsg({ type: 'success', text: `Active inference model updated to '${versionOrAlgo}'.` });
        loadData();
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to switch active model.' });
    }
  };

  const chartData = leaderboard
    .filter(m => m.pr_auc != null && m.pr_auc > 0)
    .map(m => ({
      name: m.name || m.algorithm,
      pr_auc: Math.round(m.pr_auc * 100),
      f1: Math.round((m.f1 || 0) * 100),
      recall: Math.round((m.recall || 0) * 100)
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-7xl mx-auto pb-16"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#c6f135]/15 text-[#c6f135] text-[10px] font-mono font-bold uppercase border border-[#c6f135]/30">
              Genuine Machine Learning Engine
            </span>
            <span className="text-[10px] text-[#a0a0a0] font-mono">Model Workbench & Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
            MODEL STUDIO & BENCHMARK
          </h1>
          <p className="text-[#a0a0a0] mt-0.5 text-xs sm:text-sm">
            Train, validate, and compare defect prediction models. Strict separation: predictions are driven by actual ML algorithms, not LLMs.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2a2a2a] flex items-center space-x-2 text-xs">
            <ShieldCheck size={16} className="text-[#c6f135]" />
            <span className="text-[#888]">Active Model:</span>
            <span className="font-bold text-white uppercase font-mono">
              {modelData?.active_model || 'Random Forest'}
            </span>
          </div>
        </div>
      </header>

      {/* Message Banner */}
      {msg && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 border ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-destructive/10 border-destructive/30 text-destructive'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Grid: Training Config & Leaderboard Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Train Model Card */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2">
            <BrainCircuit size={18} className="text-[#c6f135]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Train New Model</h2>
          </div>

          <form onSubmit={handleTrain} className="space-y-4 text-xs font-mono">
            {/* Algorithm Selector */}
            <div>
              <label className="block text-[#aaa] font-bold mb-1.5 uppercase text-[10px]">Algorithm</label>
              <select
                value={selectedAlgo}
                onChange={(e) => setSelectedAlgo(e.target.value)}
                className="w-full bg-[#181818] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#c6f135]"
              >
                <option value="random_forest">Random Forest (Ensemble Bagging)</option>
                <option value="xgboost">XGBoost (Gradient Boosted Trees)</option>
                <option value="lightgbm">LightGBM (Leaf-wise Boosted)</option>
                <option value="decision_tree">Decision Tree (Interpretable)</option>
                <option value="logistic_regression">Logistic Regression (Standardized)</option>
                <option value="svm">Support Vector Machine (SVM)</option>
              </select>
            </div>

            {/* Dataset Selector */}
            <div>
              <label className="block text-[#aaa] font-bold mb-1.5 uppercase text-[10px]">Training Dataset</label>
              <select
                value={selectedDatasetId || ''}
                onChange={(e) => setSelectedDatasetId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-[#181818] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#c6f135]"
              >
                <option value="">Database History Extract (Accumulated)</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows, {d.format.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Test Split Slider */}
            <div>
              <div className="flex justify-between text-[#aaa] font-bold mb-1.5 uppercase text-[10px]">
                <span>Test Split</span>
                <span className="text-[#c6f135]">{Math.round(testSplit * 100)}% Held-Out</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.40"
                step="0.05"
                value={testSplit}
                onChange={(e) => setTestSplit(parseFloat(e.target.value))}
                className="w-full accent-[#c6f135] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={training}
              className="w-full py-2.5 rounded-xl bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold text-xs uppercase flex items-center justify-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(198,241,53,0.2)] disabled:opacity-50 cursor-pointer"
            >
              <Play size={14} className={training ? 'animate-spin' : ''} />
              <span>{training ? 'Training Model...' : 'Train Selected Model'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-[#222]">
            <button
              type="button"
              onClick={handleCompare}
              disabled={comparing}
              className="w-full py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-[#333] text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trophy size={14} className="text-[#06b6d4]" />
              <span>{comparing ? 'Comparing All...' : 'Run All-Model Benchmark'}</span>
            </button>
          </div>
        </div>

        {/* Right: PR-AUC Model Benchmark Chart */}
        <div className="lg:col-span-2 bg-[#121212] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart2 size={18} className="text-[#06b6d4]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Defect Benchmark Metrics (PR-AUC & F1)
              </h2>
            </div>
            <span className="text-[10px] text-[#777] font-mono">Held-Out Test Split</span>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-[#666] border border-dashed border-[#222] rounded-xl">
              <Trophy size={32} className="mb-2 text-[#444]" />
              <span>No benchmark metrics recorded yet.</span>
              <span className="text-[11px] text-[#555] mt-1">Train models or run benchmark comparison to view performance charts.</span>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#666" fontSize={10} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#181818', borderColor: '#333', borderRadius: 8, fontSize: 11 }}
                    formatter={(val: any) => [`${val}%`, '']}
                  />
                  <Bar dataKey="pr_auc" name="PR-AUC %" fill="#c6f135" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="f1" name="F1 Score %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard & Evaluation Protocol Table */}
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy size={18} className="text-[#c6f135]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Model Comparison Leaderboard</h2>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-[#222] text-[#999]">
              Measured on Held-Out Test Set
            </span>
          </div>
          <button
            onClick={loadData}
            className="text-xs text-[#a0a0a0] hover:text-white flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>
        </div>

        {leaderboard.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#777]">
            No trained models registered yet. Select an algorithm and click "Train Selected Model".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222] text-[#777] uppercase text-[10px]">
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Precision</th>
                  <th className="py-3 px-3">Recall</th>
                  <th className="py-3 px-3">F1-Score</th>
                  <th className="py-3 px-3 text-[#c6f135]">PR-AUC</th>
                  <th className="py-3 px-3">ROC-AUC</th>
                  <th className="py-3 px-3">Top 20% Recall</th>
                  <th className="py-3 px-3">Confusion [TP/FP/TN/FN]</th>
                  <th className="py-3 px-3 text-right">Inference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {leaderboard.map((m, idx) => {
                  const isActive =
                    modelData?.active_model === m.algorithm ||
                    modelData?.active_model === m.version_tag ||
                    modelData?.active_model === m.name;

                  return (
                    <tr key={idx} className="hover:bg-[#161616] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white flex items-center space-x-2">
                        <span>{m.name || m.algorithm}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold rounded bg-[#c6f135]/20 text-[#c6f135] border border-[#c6f135]/40">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#ccc]">{m.precision != null ? (m.precision * 100).toFixed(1) + '%' : '-'}</td>
                      <td className="py-3 px-3 text-[#ccc]">{m.recall != null ? (m.recall * 100).toFixed(1) + '%' : '-'}</td>
                      <td className="py-3 px-3 text-[#ccc]">{m.f1 != null ? (m.f1 * 100).toFixed(1) + '%' : '-'}</td>
                      <td className="py-3 px-3 font-bold text-[#c6f135]">
                        {m.pr_auc != null ? (m.pr_auc * 100).toFixed(1) + '%' : '-'}
                      </td>
                      <td className="py-3 px-3 text-[#06b6d4]">
                        {m.roc_auc != null ? (m.roc_auc * 100).toFixed(1) + '%' : '-'}
                      </td>
                      <td className="py-3 px-3 text-[#ccc]">
                        {m.top_20pct_recall != null ? (m.top_20pct_recall * 100).toFixed(1) + '%' : '-'}
                      </td>
                      <td className="py-3 px-3 text-[#888]">
                        {m.confusion_matrix
                          ? `${m.confusion_matrix[1]?.[1]} / ${m.confusion_matrix[0]?.[1]} / ${m.confusion_matrix[0]?.[0]} / ${m.confusion_matrix[1]?.[0]}`
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isActive ? (
                          <span className="text-[#c6f135] text-[11px] font-bold flex items-center justify-end space-x-1">
                            <Check size={12} />
                            <span>In Use</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetActive(m.algorithm)}
                            className="px-2.5 py-1 rounded-lg bg-[#222] hover:bg-[#333] text-white text-[10px] font-bold cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ModelWorkbench;
