import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="py-12 bg-[#080808] border-t border-[#2a2a2a] text-xs text-[#a0a0a0] font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#2a2a2a]/60">
          
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-[#c6f135] shadow-[0_0_12px_rgba(198,241,53,0.3)] flex items-center justify-center p-1 overflow-hidden shrink-0">
              <img
                src={logoImg}
                alt="BugRisk insight Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-white font-bold text-sm tracking-wider">
                BugRisk<span className="text-[#c6f135]"> insight</span>
              </span>
              <p className="text-[10px] text-[#777]">Next-Gen ML Software Risk Intelligence</p>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
            <a href="#home" className="hover:text-[#c6f135] transition-colors">Home</a>
            <a href="#how-it-works" className="hover:text-[#c6f135] transition-colors">Working</a>
            <a href="#capabilities" className="hover:text-[#c6f135] transition-colors">Capabilities</a>
            <a href="#dashboard" className="hover:text-[#c6f135] transition-colors">Dashboard</a>
            <a href="#contact" className="hover:text-[#c6f135] transition-colors">Contact</a>
            <button
              type="button"
              onClick={() => navigate('/analysis')}
              className="text-[#c6f135] hover:underline"
            >
              Launch Platform →
            </button>
          </div>

          {/* Clean Social Badges */}
          <div className="flex items-center space-x-3">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-gray-400 hover:text-white transition-colors border border-[#2a2a2a] text-[11px]">
              GitHub
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-gray-400 hover:text-white transition-colors border border-[#2a2a2a] text-[11px]">
              Twitter / X
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-gray-400 hover:text-white transition-colors border border-[#2a2a2a] text-[11px]">
              LinkedIn
            </a>
          </div>

        </div>

        {/* Bottom Credits */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#666] gap-3">
          <p>© {new Date().getFullYear()} BugRisk insight Inc. All rights reserved.</p>
          <div className="flex items-center space-x-2">
            <span>Built for High-Velocity Engineering</span>
            <span>·</span>
            <span className="text-[#c6f135]">Enterprise Edition v2.0</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
