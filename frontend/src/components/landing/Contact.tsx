import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Code2, BookOpen, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    repoUrl: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Frontend-only presentation submission
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <section id="contact" className="py-24 bg-[#0a0a0a] border-t border-[#2a2a2a] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Heading & Contact Channels */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#c6f135]">
                // GET IN TOUCH
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-white mt-2 leading-[1.1]">
                LET'S REDUCE YOUR BUG RATE.
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#a0a0a0] leading-relaxed max-w-lg">
              Ready to eliminate defect blindspots across your codebase? Connect with our engineering specialists or run an immediate repository scan.
            </p>

            {/* Contact Rows with Icons */}
            <div className="space-y-4 pt-4">
              <a
                href="mailto:support@bugrisk.insight"
                className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#121212] border border-[#2a2a2a] hover:border-[#c6f135]/40 transition-all text-gray-300 hover:text-white glass-card"
              >
                <div className="p-2.5 rounded-xl bg-[#1a1a1a] text-[#c6f135] border border-[#2a2a2a]">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs font-mono text-[#a0a0a0] uppercase">Direct Email</p>
                  <p className="text-sm font-semibold text-white">support@bugrisk.insight</p>
                </div>
              </a>

              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#121212] border border-[#2a2a2a] hover:border-[#c6f135]/40 transition-all text-gray-300 hover:text-white glass-card"
              >
                <div className="p-2.5 rounded-xl bg-[#1a1a1a] text-[#c6f135] border border-[#2a2a2a]">
                  <Code2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-mono text-[#a0a0a0] uppercase">GitHub Organization</p>
                  <p className="text-sm font-semibold text-white">github.com/bugrisk.insight</p>
                </div>
              </a>

              <a
                href="#how-it-works"
                className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#121212] border border-[#2a2a2a] hover:border-[#c6f135]/40 transition-all text-gray-300 hover:text-white glass-card"
              >
                <div className="p-2.5 rounded-xl bg-[#1a1a1a] text-[#c6f135] border border-[#2a2a2a]">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="text-xs font-mono text-[#a0a0a0] uppercase">Technical Documentation</p>
                  <p className="text-sm font-semibold text-white">docs.bugrisk.insight</p>
                </div>
              </a>
            </div>
          </motion.div>

          {/* Right Column: Dark Contact Form Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6"
          >
            <div className="p-8 rounded-2xl bg-[#121212] border border-[#2a2a2a] shadow-2xl glass-card text-left">
              <h3 className="text-xl font-bold text-white mb-1">Request Repository Consultation</h3>
              <p className="text-xs text-[#a0a0a0] mb-6">
                Fill in your repository details for personalized defect profiling insights.
              </p>

              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#c6f135]/15 text-[#c6f135] flex items-center justify-center mx-auto border border-[#c6f135]/30">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-lg font-bold text-white">Inquiry Received</h4>
                  <p className="text-xs text-[#a0a0a0] max-w-xs mx-auto">
                    Thank you! Our AI code reliability team has received your repository details.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/analysis')}
                    className="px-6 py-2.5 rounded-xl bg-[#c6f135] text-[#0a0a0a] font-bold text-xs hover:bg-[#b8e32c] transition-all"
                  >
                    Launch Self-Service Scan →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#a0a0a0] uppercase mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#c6f135] transition-colors"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#a0a0a0] uppercase mb-1.5">
                      Work Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane@company.com"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#c6f135] transition-colors"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#a0a0a0] uppercase mb-1.5">
                      Repository URL
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://github.com/org/repo"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-[#555] focus:outline-none focus:border-[#c6f135] transition-colors"
                      value={formData.repoUrl}
                      onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#a0a0a0] uppercase mb-1.5">
                      Message / Primary Concerns
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Seeking automated bug prevention in our backend microservices..."
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#c6f135] transition-colors resize-none"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold rounded-xl py-3 text-xs flex items-center justify-center space-x-2 transition-all shadow-[0_0_20px_rgba(198,241,53,0.2)] disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                    <span>{submitting ? 'Submitting...' : 'Analyze Repo →'}</span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};

export default Contact;
