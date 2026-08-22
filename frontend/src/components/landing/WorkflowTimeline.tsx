import React from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Cpu, LineChart, ShieldAlert, CheckCircle } from 'lucide-react';

export const WorkflowTimeline: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Feature Extraction',
      description: 'Abstract Syntax Tree (AST) scanning extracts structural complexity, cyclomatic numbers, Halstead metrics, and code churn.',
      icon: <FileSearch size={18} className="text-[#0a0a0a]" />
    },
    {
      step: '02',
      title: 'Preprocessing & Normalization',
      description: 'Token vectors and structural signals are sanitized, normalized, and mapped into high-dimensional feature spaces.',
      icon: <Cpu size={18} className="text-[#0a0a0a]" />
    },
    {
      step: '03',
      title: 'Model Training & Inference',
      description: 'Pre-trained hybrid machine learning defect classifiers evaluate probabilistic failure patterns against empirical code benchmarks.',
      icon: <LineChart size={18} className="text-[#0a0a0a]" />
    },
    {
      step: '04',
      title: 'Predicted Risk Scoring',
      description: 'Files are assigned explicit bug probability percentages (0–100%) and categorized into actionable risk tiers.',
      icon: <ShieldAlert size={18} className="text-[#0a0a0a]" />
    },
    {
      step: '05',
      title: 'AI Auto-Remediation & Patch Diffing',
      description: 'Automated LLM engines generate verified code corrections, side-by-side Monaco diffs, and regression mitigation notes.',
      icon: <CheckCircle size={18} className="text-[#0a0a0a]" />
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#0a0a0a] relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#c6f135]">
            // HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
            THE BUGPREDICT PREDICTION PIPELINE
          </h2>
          <p className="text-sm sm:text-base text-[#a0a0a0]">
            From raw source code to proactive AI patches in five automated stages.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="relative">
          {/* Vertical Lime-Green Connecting Line */}
          <div className="absolute left-6 sm:left-1/2 top-4 bottom-4 -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#c6f135] via-[#c6f135]/60 to-[#2a2a2a]" />

          <div className="space-y-12">
            {steps.map((s, index) => {
              const isEven = index % 2 === 0;
              return (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative flex flex-col sm:flex-row items-start sm:items-center ${
                    isEven ? 'sm:flex-row-reverse' : ''
                  }`}
                >
                  {/* Left / Right Card Container */}
                  <div className={`w-full sm:w-1/2 pl-16 sm:pl-0 ${isEven ? 'sm:pl-10' : 'sm:pr-10'}`}>
                    <div className="p-6 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#c6f135] px-2.5 py-0.5 rounded bg-[#c6f135]/10 border border-[#c6f135]/30">
                          STAGE {s.step}
                        </span>
                        <span className="text-[11px] font-mono text-[#a0a0a0]">Automated</span>
                      </div>
                      <h3 className="text-lg font-bold text-white pt-1">{s.title}</h3>
                      <p className="text-xs sm:text-sm text-[#a0a0a0] leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>

                  {/* Center Dot Marker on the Line */}
                  <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#c6f135] text-[#0a0a0a] flex items-center justify-center font-bold font-mono text-xs shadow-[0_0_15px_rgba(198,241,53,0.5)] z-20">
                    {s.icon}
                  </div>

                  {/* Empty Spacer on other side */}
                  <div className="hidden sm:block sm:w-1/2" />
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};

export default WorkflowTimeline;
