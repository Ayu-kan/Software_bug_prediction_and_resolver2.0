import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Terminal, Sparkles, FileCode, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  const mockJsonReport = `{
  "file": "backend/auth/auth_service.py",
  "riskScore": 87,
  "bugType": "Authentication Issue",
  "suggestedFix": "Validate token expiration."
}`;

  return (
    <section id="home" className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Background Decorative Wireframe Network & Glowing Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#c6f135]/5 rounded-full blur-[140px]" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-[#c6f135]/[0.03] rounded-full blur-[100px]" />
        
        {/* Subtle SVG Grid Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#c6f135" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            {/* Eyebrow Label */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#161616] border border-[#2a2a2a]">
              <span className="w-2 h-2 rounded-full bg-[#c6f135] animate-pulse" />
              <span className="text-xs font-mono text-[#c6f135] font-semibold tracking-wide">
                &lt; Predicting risk... /&gt;
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight uppercase leading-[1.08] text-white">
              PREDICT <span className="text-[#c6f135] drop-shadow-[0_0_25px_rgba(198,241,53,0.35)]">BUGS</span> BEFORE THEY BREAK
            </h1>

            {/* Subheading & Description */}
            <div className="space-y-3 max-w-xl">
              <p className="text-lg sm:text-xl font-medium text-gray-200">
                AI-powered file-level risk scoring for engineering teams.
              </p>
              <p className="text-sm text-[#a0a0a0] leading-relaxed">
                BugPredict AI analyzes software repositories, prioritizes risky files using machine learning AST heuristics, predicts defect probabilities, and generates proactive remediation patches before issues reach production.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate('/analysis')}
                className="px-7 py-3.5 rounded-xl bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold text-sm flex items-center space-x-2 transition-all shadow-[0_0_25px_rgba(198,241,53,0.25)] hover:shadow-[0_0_35px_rgba(198,241,53,0.4)] cursor-pointer"
              >
                <span>Try Demo</span>
                <ArrowRight size={16} />
              </button>

              <a
                href="#how-it-works"
                className="px-6 py-3.5 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#c6f135]/40 text-gray-300 hover:text-white font-medium text-sm transition-all cursor-pointer"
              >
                View Docs
              </a>
            </div>

            {/* Live Indicators */}
            <div className="flex items-center space-x-6 pt-4 text-xs font-mono text-[#a0a0a0]">
              <div className="flex items-center space-x-2">
                <CheckCircle2 size={14} className="text-[#c6f135]" />
                <span>Zero False-Positive AST Filter</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 size={14} className="text-[#c6f135]" />
                <span>Monaco Code Diffing</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Terminal Code Editor Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5 relative"
          >
            {/* Terminal Window Frame */}
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0d0d0d] shadow-2xl overflow-hidden glass-card">
              {/* Terminal Window Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#161616] border-b border-[#2a2a2a]">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="flex items-center space-x-1.5 text-xs font-mono text-[#a0a0a0]">
                  <Terminal size={13} className="text-[#c6f135]" />
                  <span>bugpredict-report.json</span>
                </div>
                <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#c6f135]/10 text-[#c6f135] border border-[#c6f135]/30">
                  ML_v2.0
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-5 font-mono text-xs text-gray-300 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]/60">
                  <span className="text-[#a0a0a0] flex items-center space-x-2">
                    <FileCode size={14} className="text-[#c6f135]" />
                    <span>Target AST Scan</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/20 text-[11px]">
                    Risk: 87% HIGH
                  </span>
                </div>

                <pre className="text-gray-300 overflow-x-auto leading-relaxed bg-[#0a0a0a] p-4 rounded-xl border border-[#2a2a2a]">
                  <code>
                    <span className="text-[#c6f135] font-semibold">{mockJsonReport}</span>
                  </code>
                </pre>

                {/* Remediation Status Pill */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#161616] border border-[#2a2a2a]">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-[#c6f135]/10 text-[#c6f135]">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white">AI Auto-Fix Ready</p>
                      <p className="text-[10px] text-[#a0a0a0]">One-click AST side-by-side patch</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/analysis')}
                    className="px-3 py-1.5 rounded-lg bg-[#c6f135] text-[#0a0a0a] font-bold text-[11px] hover:bg-[#b8e32c] transition-colors"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
