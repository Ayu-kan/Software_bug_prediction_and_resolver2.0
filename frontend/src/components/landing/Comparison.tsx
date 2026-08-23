import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export const Comparison: React.FC = () => {
  const comparisonData = [
    {
      feature: 'Detection Timing',
      traditional: 'After issues appear in production/staging',
      bugpredict: 'Predictive analysis before code is merged',
      highlight: true
    },
    {
      feature: 'Output Granularity',
      traditional: 'Vague linter warnings & generic noise',
      bugpredict: 'Exact file-level risk % and defect scores',
      highlight: true
    },
    {
      feature: 'Developer Action',
      traditional: 'Manual triage across hundreds of alerts',
      bugpredict: 'Ranked priority queue focusing on highest-risk files',
      highlight: true
    },
    {
      feature: 'Underlying Approach',
      traditional: 'Brittle rule-based heuristics & regex scans',
      bugpredict: 'ML-powered models trained on real bug histories',
      highlight: true
    },
    {
      feature: 'Remediation Assistance',
      traditional: 'No code fixes or manual stackoverflow search',
      bugpredict: 'One-click AI code diffs & contextual remediation',
      highlight: true
    },
  ];

  return (
    <section className="py-24 bg-[#0d0d0d] border-t border-[#2a2a2a] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#c6f135]">
            // WHY BUGRISK INSIGHT
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
            TRADITIONAL STATIC TOOLS VS BUGRISK INSIGHT
          </h2>
          <p className="text-sm sm:text-base text-[#a0a0a0]">
            Why forward-thinking engineering teams switch to predictive ML defect scoring.
          </p>
        </div>

        {/* Comparison Table / Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] shadow-2xl overflow-hidden glass-card"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2a] bg-[#141414] text-xs font-mono text-[#a0a0a0] uppercase">
                  <th className="py-4 px-6 font-bold w-1/3">Feature Capability</th>
                  <th className="py-4 px-6 font-bold w-1/3 text-gray-400">Traditional Tools</th>
                  <th className="py-4 px-6 font-bold w-1/3 text-[#c6f135] bg-[#c6f135]/5 border-l border-[#2a2a2a]">
                    BugRisk insight
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a] text-xs sm:text-sm">
                {comparisonData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#121212] transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">
                      {row.feature}
                    </td>
                    <td className="py-4 px-6 text-[#a0a0a0] flex items-center space-x-2">
                      <X size={15} className="text-red-400 shrink-0" />
                      <span>{row.traditional}</span>
                    </td>
                    <td className="py-4 px-6 text-white font-medium bg-[#c6f135]/5 border-l border-[#2a2a2a]">
                      <div className="flex items-center space-x-2">
                        <Check size={16} className="text-[#c6f135] shrink-0" />
                        <span className="text-[#c6f135] font-semibold">{row.bugpredict}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default Comparison;
