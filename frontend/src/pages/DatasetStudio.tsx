import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileSpreadsheet, Trash2, Eye, RefreshCw,
  CheckCircle2, AlertCircle, Database, Table,
  Layers, X, FileText
} from 'lucide-react';
import { datasetAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface DatasetItem {
  id: number;
  name: string;
  format: string;
  row_count: number;
  feature_count: number;
  created_at: string;
  file_path?: string;
}

export const DatasetStudio: React.FC = () => {
  const { activeWorkspace } = useAuthStore();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const res = await datasetAPI.list(activeWorkspace?.id);
      if (res.success && Array.isArray(res.datasets)) {
        setDatasets(res.datasets);
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to load datasets.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, [activeWorkspace?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      setMsg({ type: 'error', text: 'Only .csv and .json files are supported.' });
      return;
    }

    setUploading(true);
    setMsg(null);
    const formData = new FormData();
    formData.append('file', file);
    if (activeWorkspace?.id) {
      formData.append('workspace_id', String(activeWorkspace.id));
    }

    try {
      const res = await datasetAPI.upload(formData);
      if (res.success) {
        setMsg({ type: 'success', text: `Uploaded '${res.name}' (${res.row_count} rows, ${res.column_count} features).` });
        loadDatasets();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to upload dataset.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || err.message || 'Upload failed.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePreview = async (id: number) => {
    setPreviewId(id);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await datasetAPI.preview(id);
      if (res.success) {
        setPreviewData(res);
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to fetch preview.' });
        setPreviewId(null);
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Could not load dataset preview.' });
      setPreviewId(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;
    try {
      const res = await datasetAPI.delete(id);
      if (res.success) {
        setDatasets(prev => prev.filter(d => d.id !== id));
        if (previewId === id) setPreviewId(null);
        setMsg({ type: 'success', text: 'Dataset deleted.' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to delete dataset.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Could not delete dataset.' });
    }
  };

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
              Data Ingestion & Feature Store
            </span>
            <span className="text-[10px] text-[#a0a0a0] font-mono">Dataset Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
            SOFTWARE DEFECT DATASETS
          </h1>
          <p className="text-[#a0a0a0] mt-0.5 text-xs sm:text-sm">
            Upload CSV/JSON repositories, inspect feature quality, preview schemas, and prepare data for ML model training.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-[0_0_15px_rgba(198,241,53,0.25)] cursor-pointer">
            <UploadCloud size={16} />
            <span>{uploading ? 'Processing Dataset...' : 'Upload CSV / JSON'}</span>
            <input
              type="file"
              accept=".csv,.json"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
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

      {/* Datasets Table */}
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database size={18} className="text-[#c6f135]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Ingested Datasets</h2>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-[#222] text-[#999]">
              {datasets.length} Total
            </span>
          </div>
          <button
            onClick={loadDatasets}
            className="text-xs text-[#a0a0a0] hover:text-white flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#777]">Loading datasets...</div>
        ) : datasets.length === 0 ? (
          <div className="py-14 text-center border border-dashed border-[#2a2a2a] rounded-xl space-y-3">
            <FileSpreadsheet size={36} className="mx-auto text-[#555]" />
            <p className="text-sm font-medium text-[#ccc]">No datasets uploaded yet.</p>
            <p className="text-xs text-[#777] max-w-sm mx-auto">
              Upload a software defect dataset (e.g. NASA MDP, PROMISE, Jureczko CSV, or Git defect extract) to train and compare models.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222] text-[#777] uppercase text-[10px]">
                  <th className="py-3 px-3">Dataset Name</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Rows</th>
                  <th className="py-3 px-3">Features</th>
                  <th className="py-3 px-3">Uploaded</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-[#161616] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white flex items-center space-x-2">
                      <FileText size={14} className="text-[#c6f135] shrink-0" />
                      <span className="truncate max-w-xs">{d.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded uppercase text-[10px] bg-[#222] text-[#bbb]">
                        {d.format}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#ccc]">{d.row_count.toLocaleString()}</td>
                    <td className="py-3 px-3 text-[#ccc]">{d.feature_count}</td>
                    <td className="py-3 px-3 text-[#777]">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handlePreview(d.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#c6f135] text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer inline-flex items-center"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dataset Preview Drawer / Modal */}
      <AnimatePresence>
        {previewId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#121212] border border-[#2a2a2a] w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-[#222]">
                <div className="flex items-center space-x-2">
                  <Table size={18} className="text-[#c6f135]" />
                  <h3 className="font-bold text-white text-base">
                    Dataset Schema & Preview: {previewData?.dataset?.name || 'Inspecting...'}
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewId(null)}
                  className="p-1.5 rounded-lg text-[#777] hover:text-white hover:bg-[#222] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {previewLoading ? (
                  <div className="py-20 text-center text-sm text-[#777]">Inspecting schema and columns...</div>
                ) : previewData ? (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-[#181818] rounded-xl border border-[#262626]">
                        <span className="text-[10px] uppercase font-mono text-[#777]">Total Rows</span>
                        <p className="text-lg font-bold text-white mt-0.5">{previewData.schema.total_rows.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-[#181818] rounded-xl border border-[#262626]">
                        <span className="text-[10px] uppercase font-mono text-[#777]">Total Columns</span>
                        <p className="text-lg font-bold text-white mt-0.5">{previewData.schema.total_columns}</p>
                      </div>
                      <div className="p-3 bg-[#181818] rounded-xl border border-[#262626]">
                        <span className="text-[10px] uppercase font-mono text-[#777]">Target Column</span>
                        <p className="text-lg font-bold text-[#c6f135] mt-0.5">
                          {previewData.schema.potential_targets?.[0] || 'future_bug'}
                        </p>
                      </div>
                      <div className="p-3 bg-[#181818] rounded-xl border border-[#262626]">
                        <span className="text-[10px] uppercase font-mono text-[#777]">Format</span>
                        <p className="text-lg font-bold text-[#06b6d4] uppercase mt-0.5">{previewData.dataset.format}</p>
                      </div>
                    </div>

                    {/* Column Schema Table */}
                    <div>
                      <h4 className="text-xs font-bold uppercase text-[#aaa] mb-2.5 flex items-center space-x-1.5">
                        <Layers size={14} className="text-[#c6f135]" />
                        <span>Feature Schema & Quality</span>
                      </h4>
                      <div className="border border-[#222] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[#181818] text-[#777] uppercase text-[10px] sticky top-0">
                            <tr>
                              <th className="py-2 px-3">Column Name</th>
                              <th className="py-2 px-3">Type</th>
                              <th className="py-2 px-3">Missing</th>
                              <th className="py-2 px-3">Mean</th>
                              <th className="py-2 px-3">Range [Min - Max]</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#202020] bg-[#121212]">
                            {previewData.schema.columns.map((c: any) => (
                              <tr key={c.name} className="hover:bg-[#181818]">
                                <td className="py-2 px-3 font-semibold text-white">{c.name}</td>
                                <td className="py-2 px-3 text-[#888]">{c.dtype}</td>
                                <td className="py-2 px-3">
                                  {c.missing_count > 0 ? (
                                    <span className="text-yellow-400">{c.missing_count} ({c.missing_percent}%)</span>
                                  ) : (
                                    <span className="text-emerald-400">0%</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-[#ccc]">{c.mean != null ? c.mean : '-'}</td>
                                <td className="py-2 px-3 text-[#777]">
                                  {c.min != null && c.max != null ? `[${c.min} — ${c.max}]` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* First 20 Rows Preview */}
                    <div>
                      <h4 className="text-xs font-bold uppercase text-[#aaa] mb-2.5 flex items-center space-x-1.5">
                        <Table size={14} className="text-[#06b6d4]" />
                        <span>Data Preview (First 20 Records)</span>
                      </h4>
                      <div className="border border-[#222] rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead className="bg-[#181818] text-[#777] uppercase text-[10px] sticky top-0">
                            <tr>
                              {Object.keys(previewData.preview_rows[0] || {}).map((k) => (
                                <th key={k} className="py-2 px-3 whitespace-nowrap">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#202020] bg-[#121212]">
                            {previewData.preview_rows.map((r: any, idx: number) => (
                              <tr key={idx} className="hover:bg-[#181818]">
                                {Object.values(r).map((val: any, cIdx: number) => (
                                  <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap text-[#ccc]">
                                    {String(val ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#222] flex justify-end">
                <button
                  onClick={() => setPreviewId(null)}
                  className="px-4 py-2 rounded-xl bg-[#222] hover:bg-[#333] text-white text-xs font-bold cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DatasetStudio;
