import React from 'react';
import { motion } from 'framer-motion';
import {
  Wand2, ListOrdered, Globe2, Activity, Zap, Users, ArrowUpRight
} from 'lucide-react';

export const Capabilities: React.FC = () => {
  const capabilities = [
    {
      title: 'Predict + Fix',
      description: 'Detect potential software issues and generate precise, side-by-side AI remediation patches before production deployment.',
      icon: <Wand2 size={24} className="text-[#c6f135]" />,
      tag: 'AI Remediation'
    },
    {
      title: 'File-Level Prioritization',
      description: 'Rank every file across your repository based on calculated defect probabilities and cyclomatic complexity metrics.',
      icon: <ListOrdered size={24} className="text-[#c6f135]" />,
      tag: 'Smart Ranking'
    },
    {
      title: 'Multilingual Support',
      description: 'Native AST parsing and pattern defect recognition across Python, TypeScript, JavaScript, Java, C++, and Go.',
      icon: <Globe2 size={24} className="text-[#c6f135]" />,
      tag: 'Cross-Language'
    },
    {
      title: 'Continuous Monitoring',
      description: 'Track long-term repository risk trends, code stability velocity, and defect reduction over git commit histories.',
      icon: <Activity size={24} className="text-[#c6f135]" />,
      tag: 'Historical Analytics'
    },
    {
      title: 'Token Optimization',
      description: 'Isolate vulnerable code segments and functions to prevent bloating context windows and optimize LLM generation costs.',
      icon: <Zap size={24} className="text-[#c6f135]" />,
      tag: 'Cost Efficient'
    },
    {
      title: 'Team Collaboration',
      description: 'Share bug audits, delegate file reviews, invite teammates, and manage role-based workspace permissions in real-time.',
      icon: <Users size={24} className="text-[#c6f135]" />,
      tag: 'RBAC Workspaces'
    },
  ];

  return (
    <section id="capabilities" className="py-24 bg-[#0a0a0a] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#c6f135]">
            // CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
            ENTERPRISE BUG INTELLIGENCE FEATURES
          </h2>
          <p className="text-sm sm:text-base text-[#a0a0a0]">
            Engineered for high-velocity software teams seeking early detection and AI-assisted patch resolution.
          </p>
        </div>

        {/* 6-Card Grid (3 Columns x 2 Rows) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="p-6 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] group-hover:border-[#c6f135]/40 transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-[#161616] text-[#a0a0a0] border border-[#2a2a2a] group-hover:text-[#c6f135] group-hover:border-[#c6f135]/30 transition-colors">
                    {item.tag}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-[#c6f135] transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 text-[#c6f135] transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </h3>
                  <p className="text-xs sm:text-sm text-[#a0a0a0] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2a2a2a]/60 flex items-center justify-between text-[11px] font-mono text-[#a0a0a0]">
                <span>BugPredict v2.0</span>
                <span className="text-emerald-400">Available</span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Capabilities;
