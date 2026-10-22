import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { analysisAPI, modelAPI } from '../services/api';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  ShieldCheck, ShieldAlert, FileWarning, Activity, Users,
  FolderGit2, ArrowRight, Sparkles, BarChart2, PieChart as PieIcon,
  Cpu, Database
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { user, activeWorkspace } = useAuthStore();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<'pie' | 'histogram'>('pie');
  const [activeModel, setActiveModel] = useState<string>('Random Forest');

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      setHistory([]);
      analysisAPI.getHistory(user.id, activeWorkspace?.id).then((res) => {
        if (res.success && Array.isArray(res.history)) {
          setHistory(res.history);
        } else {
          setHistory([]);
        }
        setLoading(false);
      }).catch(() => {
        setHistory([]);
        setLoading(false);
      });

      // Fetch active ML model
      modelAPI.listModels().then((res) => {
        if (res.success && res.active_model) {
          setActiveModel(res.active_model);
        }
      }).catch(() => {});
    } else {
      setHistory([]);
      setLoading(false);
    }
  }, [user?.id, activeWorkspace?.id]);

  const latestAnalysis = history.length > 0 ? history[0] : null;

  // Safely parse full_results_json if available to inspect individual files
  const parsedFullResults = useMemo(() => {
    if (!latestAnalysis?.full_results_json) return null;
    try {
      return typeof latestAnalysis.full_results_json === 'string'
        ? JSON.parse(latestAnalysis.full_results_json)
        : latestAnalysis.full_results_json;
    } catch {
      return null;
    }
  }, [latestAnalysis]);

  // Real Pie Chart data based on actual scanned file count
  const pieChartData = useMemo(() => {
    if (!latestAnalysis || latestAnalysis.total_files === 0) return [];
    const total = latestAnalysis.total_files;
    const high = latestAnalysis.high_risk_count;
    const lowMed = Math.max(0, total - high);
    
    return [
      {
        name: 'High Risk (≥ 75%)',
        value: high,
        percent: Math.round((high / total) * 100),
        color: '#ef4444' // red-500
      },
      {
        name: 'Low / Moderate Risk',
        value: lowMed,
        percent: Math.round((lowMed / total) * 100),
        color: '#c6f135' // neon lime
      }
    ];
  }, [latestAnalysis]);

  // Real Risk Score Histogram data (calculated strictly from file ML probabilities, no synthetic math)
  const histogramData = useMemo(() => {
    if (!latestAnalysis) return [];
    const files: any[] = parsedFullResults?.all_ranked_files || [];

    const bins = [
      { bin: '0–20%', label: 'Minimal', count: 0, fill: '#10b981' },
      { bin: '21–40%', label: 'Low', count: 0, fill: '#06b6d4' },
      { bin: '41–60%', label: 'Moderate', count: 0, fill: '#c6f135' },
      { bin: '61–80%', label: 'Elevated', count: 0, fill: '#f59e0b' },
      { bin: '81–100%', label: 'High', count: 0, fill: '#ef4444' },
    ];

    if (files.length > 0) {
      files.forEach((f) => {
        const prob = typeof f.ml_probability === 'number'
          ? f.ml_probability * 100
          : (typeof f['risk_%'] === 'number' ? f['risk_%'] : 0);

        if (prob <= 20) bins[0].count++;
        else if (prob <= 40) bins[1].count++;
        else if (prob <= 60) bins[2].count++;
        else if (prob <= 80) bins[3].count++;
        else bins[4].count++;
      });
      return bins;
    }

    // Exact fallback matching recorded risk counts when file arrays are archived
    const total = latestAnalysis.total_files || 0;
    const high = latestAnalysis.high_risk_count || 0;
    const lowMed = Math.max(0, total - high);
    return [
      { bin: '0–50%', label: 'Low / Moderate', count: lowMed, fill: '#10b981' },
      { bin: '51–74%', label: 'Elevated', count: 0, fill: '#f59e0b' },
      { bin: '75–100%', label: 'High Risk', count: high, fill: '#ef4444' },
    ];
  }, [latestAnalysis, parsedFullResults]);

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
              {activeWorkspace ? `Team Workspace · ${activeWorkspace.name}` : 'Personal Workspace'}
            </span>
            <span className="text-[10px] text-[#a0a0a0] font-mono">BugPredict AI Enterprise v2.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
            WELCOME BACK, {user?.username}
          </h1>
          <p className="text-[#a0a0a0] mt-0.5 text-xs sm:text-sm">
            Continuous repository risk intelligence, AST defect analytics, and ML bug resolution.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/models')}
            className="bg-[#181818] hover:bg-[#222222] text-[#c6f135] border border-[#2a2a2a] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Cpu size={14} />
            <span>Active Model: {activeModel}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/analysis')}
            className="bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(198,241,53,0.25)] cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Launch New Scan</span>
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Audits"
          value={history.length}
          icon={<Activity size={22} className="text-[#c6f135]" />}
          subtitle="Lifetime analysis runs"
          delay={0.05}
        />
        <MetricCard
          title="Active Inference Model"
          value={activeModel}
          icon={<Cpu size={22} className="text-[#c6f135]" />}
          subtitle="Trained ML model"
          delay={0.1}
        />
        <MetricCard
          title="Files Audited"
          value={latestAnalysis?.total_files || 0}
          icon={<FileWarning size={22} className="text-yellow-400" />}
          subtitle="Inventory file count"
          delay={0.15}
        />
        <MetricCard
          title="High Risk Files"
          value={latestAnalysis?.high_risk_count || 0}
          icon={<ShieldAlert size={22} className="text-red-400" />}
          subtitle="ML probability ≥ 75%"
          delay={0.2}
        />
      </div>

      {/* Developer Workbench Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => navigate('/models')}
          className="p-4 rounded-xl bg-gradient-to-r from-[#141414] to-[#1a1a1a] border border-[#2a2a2a] hover:border-[#c6f135]/50 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-[#c6f135]/10 text-[#c6f135] group-hover:scale-105 transition-transform">
              <Cpu size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Model Workbench</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c6f135]/20 text-[#c6f135] font-mono">6 Models</span>
              </h4>
              <p className="text-xs text-[#a0a0a0]">Train, benchmark PR-AUC/ROC-AUC, and hot-swap inference models</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-[#a0a0a0] group-hover:text-[#c6f135] group-hover:translate-x-1 transition-all" />
        </div>

        <div
          onClick={() => navigate('/datasets')}
          className="p-4 rounded-xl bg-gradient-to-r from-[#141414] to-[#1a1a1a] border border-[#2a2a2a] hover:border-[#06b6d4]/50 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-[#06b6d4]/10 text-[#06b6d4] group-hover:scale-105 transition-transform">
              <Database size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Dataset Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#06b6d4]/20 text-[#06b6d4] font-mono">CSV / JSON / Repo</span>
              </h4>
              <p className="text-xs text-[#a0a0a0]">Inspect schema distributions, missing rates, and prevent data leakage</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-[#a0a0a0] group-hover:text-[#06b6d4] group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* Grid: Charts + Recent Analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Risk Analytics (Pie Chart + Histogram Toggle) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-1 p-6 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-bold text-white uppercase">Risk Distribution</h2>
                <p className="text-[11px] text-[#a0a0a0] font-mono">Latest defect profile</p>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-[#0a0a0a] p-1 rounded-lg border border-[#2a2a2a] text-xs">
                <button
                  type="button"
                  onClick={() => setChartView('pie')}
                  className={`p-1.5 rounded-md transition-colors ${
                    chartView === 'pie' ? 'bg-[#c6f135] text-[#0a0a0a] font-bold shadow-xs' : 'text-[#a0a0a0] hover:text-white'
                  }`}
                  title="Pie Chart View"
                >
                  <PieIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('histogram')}
                  className={`p-1.5 rounded-md transition-colors ${
                    chartView === 'histogram' ? 'bg-[#c6f135] text-[#0a0a0a] font-bold shadow-xs' : 'text-[#a0a0a0] hover:text-white'
                  }`}
                  title="Histogram Risk Distribution View"
                >
                  <BarChart2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {latestAnalysis ? (
            <div className="my-2">
              {chartView === 'pie' ? (
                /* Modern Pie Chart with Percentages */
                <div className="h-56 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a0a0a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#fff'
                        }}
                        formatter={(val: any, name: any) => [`${val} files (${Math.round((Number(val)/latestAnalysis.total_files)*100)}%)`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Clean Legend with Percentages */}
                  <div className="flex justify-center space-x-4 text-xs font-mono mt-2">
                    {pieChartData.map((d) => (
                      <div key={d.name} className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                        <span className="text-[#a0a0a0] text-[11px]">
                          {d.name.split(' ')[0]}: <strong className="text-white">{d.value} ({d.percent}%)</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Risk Score Binned Histogram */
                <div className="h-56 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="bin" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a0a0a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#fff'
                        }}
                        formatter={(val: any) => [`${val} files`, 'Risk Volume']}
                        labelFormatter={(label: any) => `Risk Score Range: ${label}`}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {histogramData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-center text-[10px] text-[#a0a0a0] font-mono mt-1">
                    Risk Probability Distribution (Histogram Bins)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-[#a0a0a0] text-xs space-y-2">
              <ShieldCheck size={32} className="opacity-40 text-[#c6f135]" />
              <p>No repository data analyzed yet.</p>
            </div>
          )}

          <div className="pt-3 border-t border-[#2a2a2a] mt-2">
            <button
              type="button"
              onClick={() => navigate('/analysis')}
              className="w-full py-2.5 rounded-xl bg-[#181818] hover:bg-[#202020] text-xs font-mono font-bold text-[#c6f135] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-[#2a2a2a]"
            >
              <span>Audit Current Repository</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>

        {/* Recent Analyses Overview Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 p-6 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white uppercase">Recent Audits</h2>
                <p className="text-[11px] text-[#a0a0a0] font-mono">Historical bug predictions and risk inventories</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="text-xs text-[#c6f135] hover:underline font-mono font-bold flex items-center space-x-1"
              >
                <span>View Full History</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center text-xs text-[#a0a0a0] font-mono">
                Loading history records...
              </div>
            ) : history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#2a2a2a] text-[#a0a0a0] uppercase text-[10px]">
                      <th className="pb-3 font-bold">Repository</th>
                      <th className="pb-3 font-bold">Mode</th>
                      <th className="pb-3 font-bold">Files</th>
                      <th className="pb-3 font-bold">High Risk</th>
                      <th className="pb-3 font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {history.slice(0, 5).map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => navigate('/history')}
                        className="hover:bg-[#181818] transition-colors cursor-pointer"
                      >
                        <td className="py-3 font-semibold text-white flex items-center space-x-2">
                          <FolderGit2 size={14} className="text-[#c6f135] shrink-0" />
                          <span className="truncate max-w-[170px]">{item.repo_name}</span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-[#181818] rounded text-[10px] border border-[#2a2a2a] text-gray-300">
                            {item.analysis_mode?.split(' ')[0] || 'Normal'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-300">{item.total_files}</td>
                        <td className="py-3">
                          <span className={item.high_risk_count > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                            {item.high_risk_count}
                          </span>
                        </td>
                        <td className="py-3 text-[#a0a0a0] text-[11px]">
                          {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-[#a0a0a0] text-xs space-y-2">
                <FolderGit2 size={32} className="opacity-40 text-[#c6f135]" />
                <p>No repository audits found in this workspace.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#2a2a2a] mt-3 flex items-center justify-between text-xs text-[#a0a0a0] font-mono">
            <span>BugPredict AI Enterprise v2.0</span>
            <button
              type="button"
              onClick={() => navigate('/workspaces')}
              className="text-[#c6f135] hover:underline flex items-center space-x-1"
            >
              <Users size={12} />
              <span>Manage Team Workspaces</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const MetricCard = ({
  title, value, icon, subtitle, delay
}: {
  title: string; value: string | number; icon: React.ReactNode; subtitle?: string; delay: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="p-5 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card flex items-center space-x-4"
  >
    <div className="p-3 bg-[#181818] rounded-xl border border-[#2a2a2a] text-white shrink-0 shadow-inner">
      {icon}
    </div>
    <div className="truncate min-w-0">
      <p className="text-[11px] font-mono font-bold text-[#a0a0a0] uppercase tracking-wider truncate">{title}</p>
      <h3 className="text-xl font-extrabold truncate mt-0.5 text-white font-mono">{value}</h3>
      {subtitle && <p className="text-[10px] text-[#777] font-mono truncate">{subtitle}</p>}
    </div>
  </motion.div>
);

export default Dashboard;
