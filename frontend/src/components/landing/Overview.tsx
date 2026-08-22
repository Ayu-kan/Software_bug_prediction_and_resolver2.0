import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, ShieldCheck, Bug, Cpu } from 'lucide-react';

export const Overview: React.FC = () => {
  const stats = [
    { label: 'Repositories Analyzed', value: '500+', icon: <GitBranch size={20} className="text-[#c6f135]" /> },
    { label: 'Prediction Accuracy', value: '95%', icon: <ShieldCheck size={20} className="text-[#c6f135]" /> },
    { label: 'Bugs Prevented', value: '10K+', icon: <Bug size={20} className="text-[#c6f135]" /> },
  ];

  return (
    <section className="py-20 bg-[#0d0d0d] border-y border-[#2a2a2a] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Dark Code Scanning Visual with Moving Scan Line */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 relative"
          >
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-6 shadow-2xl relative overflow-hidden font-mono text-xs text-gray-400 glass-card">
              {/* Radar Moving Scanning Line Animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#c6f135] to-transparent opacity-80 animate-pulse shadow-[0_0_15px_#c6f135]" />
              
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2a2a2a]">
                <div className="flex items-center space-x-2">
                  <Cpu size={16} className="text-[#c6f135]" />
                  <span className="text-white font-bold">AST PARSER & HYBRID ML PIPELINE</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#c6f135]/15 text-[#c6f135] text-[10px] font-bold">
                  SCANNING
                </span>
              </div>

              {/* Code Scanning Simulation Lines */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500">01</span>
                  <span className="truncate max-w-[280px]">def extract_ast_metrics(source_tree):</span>
                  <span className="text-emerald-400">PASSED</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500">02</span>
                  <span className="truncate max-w-[280px]">    complexity = calculate_cyclomatic_cc(node)</span>
                  <span className="text-yellow-400">CC=14</span>
                </div>
                <div className="flex items-center justify-between bg-[#c6f135]/10 p-1.5 rounded-lg border border-[#c6f135]/30 text-white">
                  <span className="text-[#c6f135] font-bold">03</span>
                  <span className="text-[#c6f135] font-semibold truncate max-w-[280px]">    if risk_probability &gt;= 0.75:</span>
                  <span className="text-red-400 font-bold">DEFECT_FLAGGED</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500">04</span>
                  <span className="truncate max-w-[280px]">        queue_for_remediation(file_path)</span>
                  <span className="text-blue-400">RESOLVED</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500">05</span>
                  <span className="truncate max-w-[280px]">    return compile_risk_inventory()</span>
                  <span className="text-emerald-400">READY</span>
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-5 pt-3 border-t border-[#2a2a2a] flex items-center justify-between text-[11px] text-[#a0a0a0]">
                <span>Files In Scope: 142</span>
                <span className="text-[#c6f135] font-semibold">Zero False Positives</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Narrative Description & Stat Cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#c6f135]">
                // OVERVIEW
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white mt-2">
                REVOLUTIONIZING REPOSITORY RISK INTELLIGENCE
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#a0a0a0] leading-relaxed">
              BugPredict AI unifies static AST syntax inspection with pre-trained machine learning defect classifiers. By analyzing churn, structural complexity, and coupling graphs, engineering teams gain instant file-level visibility into vulnerabilities before committing code.
            </p>

            {/* 3 Metric Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card flex flex-col justify-between"
                >
                  <div className="mb-2 p-2 rounded-xl bg-[#1a1a1a] w-fit border border-[#2a2a2a]">
                    {stat.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-white font-mono">{stat.value}</h3>
                    <p className="text-xs text-[#a0a0a0] mt-1 leading-snug">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};

export default Overview;
