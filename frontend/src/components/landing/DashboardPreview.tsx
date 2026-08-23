import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export const DashboardPreview: React.FC = () => {
  const navigate = useNavigate();

  const mockFiles = [
    { file: 'backend/auth/security.py', score: 92, status: 'High Risk', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', dot: 'bg-red-500' },
    { file: 'backend/database/db.py', score: 78, status: 'Med-High', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-500' },
    { file: 'frontend/src/App.jsx', score: 54, status: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', dot: 'bg-yellow-500' },
    { file: 'utils/helpers.py', score: 21, status: 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
  ];

  const trendData = [
    { commit: 'v1.1', risk: 85 },
    { commit: 'v1.2', risk: 72 },
    { commit: 'v1.3', risk: 65 },
    { commit: 'v1.4', risk: 48 },
    { commit: 'v2.0', risk: 24 },
  ];

  return (
    <section id="dashboard" className="py-24 bg-[#0d0d0d] border-t border-[#2a2a2a] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-2 text-left">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#c6f135]">
              // LIVE DASHBOARD
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
              INTELLIGENCE COMMAND CENTER
            </h2>
            <p className="text-sm text-[#a0a0a0] max-w-xl">
              Inspect file-level risk rankings, trigger automated LLM remediation diffs, and track code health velocity in real-time.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/analysis')}
            className="px-5 py-2.5 rounded-xl bg-[#c6f135] text-[#0a0a0a] font-bold text-xs flex items-center space-x-2 transition-all hover:bg-[#b8e32c] shadow-[0_0_20px_rgba(198,241,53,0.2)] shrink-0 w-fit cursor-pointer"
          >
            <LayoutDashboard size={14} />
            <span>Open Interactive App</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Browser Frame Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] shadow-2xl overflow-hidden glass-card"
        >
          {/* Browser Top Navigation Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#141414] border-b border-[#2a2a2a]">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>

            {/* URL Search Mock */}
            <div className="flex items-center space-x-2 px-6 py-1 rounded-full bg-[#0a0a0a] border border-[#2a2a2a] text-xs font-mono text-[#a0a0a0] max-w-md w-full justify-center">
              <span className="text-[#c6f135]">https://</span>
              <span>app.bugrisk.insight/repository/audit/104</span>
            </div>

            <div className="text-[11px] font-mono text-[#c6f135] font-bold">
              LIVE PREVIEW
            </div>
          </div>

          {/* Browser Content Grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Panel: Ranked Files List with colored risk indicators */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
                <span className="text-xs font-mono uppercase text-[#a0a0a0] font-bold">Prioritized Risk Inventory</span>
                <span className="text-[11px] font-mono text-[#c6f135]">AST Rank sorted</span>
              </div>

              <div className="space-y-2.5">
                {mockFiles.map((f, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-[#121212] border border-[#2a2a2a] hover:border-[#c6f135]/40 transition-all flex items-center justify-between font-mono text-xs"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${f.dot}`} />
                      <span className="text-gray-200 truncate">{f.file}</span>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${f.bg} ${f.color} ${f.border}`}>
                        {f.score}% {f.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel: Risk Trend Chart */}
            <div className="lg:col-span-5 rounded-xl bg-[#121212] border border-[#2a2a2a] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase">Defect Reduction Velocity</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#c6f135]/15 text-[#c6f135] font-bold">
                    -71% Risk
                  </span>
                </div>
                <p className="text-[11px] text-[#a0a0a0] font-mono mb-4">Risk trend over previous release commits</p>

                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c6f135" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#c6f135" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="commit" stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#666" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a0a0a',
                          borderColor: '#2a2a2a',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                      <Area type="monotone" dataKey="risk" stroke="#c6f135" strokeWidth={2} fillOpacity={1} fill="url(#limeGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#2a2a2a] flex items-center justify-between text-xs">
                <span className="text-[#a0a0a0]">Status: Cleaned</span>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="text-[#c6f135] font-semibold hover:underline flex items-center space-x-1"
                >
                  <span>View Repository History</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default DashboardPreview;
