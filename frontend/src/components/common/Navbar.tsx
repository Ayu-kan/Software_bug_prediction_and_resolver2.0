import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, Menu, X, KeyRound, Users, ChevronDown, Check, Building2,
  ArrowRight, LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { workspaceAPI } from '../../services/api';
import type { Workspace } from '../../types';

export const Navbar: React.FC = () => {
  const {
    logout, user, llmConfig, activeWorkspace, setActiveWorkspace,
    userWorkspaces, setUserWorkspaces, getActiveApiKey, getCurrentRole, isAuthenticated
  } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  const activeKey = getActiveApiKey();
  const hasKey = Boolean(activeKey && activeKey.trim().length > 0);
  const currentRole = getCurrentRole();

  useEffect(() => {
    if (user?.id) {
      workspaceAPI.getUserWorkspaces(user.id).then((res) => {
        if (res.success && Array.isArray(res.workspaces)) {
          setUserWorkspaces(res.workspaces);
          if (activeWorkspace) {
            const updated = res.workspaces.find((w: Workspace) => w.id === activeWorkspace.id);
            if (updated) setActiveWorkspace(updated);
          }
        }
      }).catch(() => {});

      workspaceAPI.getPendingInvitations(user.id).then((res) => {
        if (res.success && Array.isArray(res.invitations)) {
          setPendingInvitesCount(res.invitations.length);
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Home', isHash: false },
    { to: '/#how-it-works', label: 'Working', isHash: true },
    { to: '/#capabilities', label: 'Features', isHash: true },
    { to: '/dashboard', label: 'Dashboard', isHash: false },
    { to: '/analysis', label: 'Analysis', isHash: false },
    { to: '/history', label: 'History', isHash: false },
    { to: '/workspaces', label: 'Workspaces', isHash: false, badge: pendingInvitesCount },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#2a2a2a] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          
          {/* Left: Neon Lime BP_ Logo & Product Title */}
          <div className="flex items-center space-x-3 shrink-0">
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 rounded-lg bg-[#c6f135] text-[#0a0a0a] flex items-center justify-center font-extrabold text-sm shadow-[0_0_15px_rgba(198,241,53,0.35)]">
                BP_
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-white leading-none">
                  BugPredict<span className="text-[#c6f135]"> AI</span>
                </span>
                <span className="text-[9px] font-mono text-[#a0a0a0] mt-0.5 tracking-wider uppercase">
                  Enterprise v2.0
                </span>
              </div>
            </div>

            {/* Active Workspace Selector Pill (Non-overlapping) */}
            {isAuthenticated && (
              <div className="relative hidden lg:block ml-2">
                <button
                  type="button"
                  onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] border border-[#2a2a2a] text-xs font-mono text-gray-300 transition-all cursor-pointer"
                >
                  <Building2 size={12} className="text-[#c6f135] shrink-0" />
                  <span className="max-w-[130px] truncate">
                    {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
                  </span>
                  {activeWorkspace && (
                    <span className="px-1.5 py-0.2 rounded bg-[#c6f135]/20 text-[#c6f135] text-[9px] font-bold uppercase">
                      {currentRole}
                    </span>
                  )}
                  <ChevronDown size={11} className="text-[#777] shrink-0" />
                </button>

                {wsDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setWsDropdownOpen(false)} />
                    <div className="absolute left-0 mt-2 w-64 bg-[#121212] rounded-xl border border-[#2a2a2a] shadow-2xl z-50 p-1.5 space-y-1">
                      <p className="px-3 py-1 text-[10px] font-mono uppercase text-[#a0a0a0] font-bold">Select Active Space</p>
                      
                      {/* Personal Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkspace(null);
                          setWsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                          activeWorkspace === null ? 'bg-[#c6f135]/15 text-[#c6f135] font-bold' : 'hover:bg-[#1a1a1a] text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <User size={13} />
                          <span>Personal Workspace</span>
                        </div>
                        {activeWorkspace === null && <Check size={13} className="text-[#c6f135]" />}
                      </button>

                      {/* Team Workspaces */}
                      {userWorkspaces.map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => {
                            setActiveWorkspace(ws);
                            setWsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                            activeWorkspace?.id === ws.id ? 'bg-[#c6f135]/15 text-[#c6f135] font-bold' : 'hover:bg-[#1a1a1a] text-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate min-w-0 pr-1">
                            <Users size={13} />
                            <span className="truncate">{ws.name}</span>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#a0a0a0] text-[9px] uppercase font-bold">
                              {ws.role || 'Member'}
                            </span>
                            {activeWorkspace?.id === ws.id && <Check size={13} className="text-[#c6f135]" />}
                          </div>
                        </button>
                      ))}

                      <div className="pt-1 border-t border-[#2a2a2a]">
                        <button
                          type="button"
                          onClick={() => {
                            setWsDropdownOpen(false);
                            navigate('/workspaces');
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono text-[#c6f135] hover:bg-[#c6f135]/10 transition-colors"
                        >
                          + Manage Workspaces
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Center: Navigation Links with Lime Underline Active State */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const isActive = !link.isHash && location.pathname === link.to;
              return (
                <a
                  key={link.label}
                  href={link.to}
                  onClick={(e) => {
                    if (!link.isHash) {
                      e.preventDefault();
                      navigate(link.to);
                    }
                  }}
                  className={`relative px-3 py-1.5 text-xs font-medium transition-colors tracking-wide flex items-center space-x-1.5 ${
                    isActive
                      ? 'text-[#c6f135] font-bold'
                      : 'text-[#a0a0a0] hover:text-white'
                  }`}
                >
                  <span>{link.label}</span>
                  {Boolean(link.badge && link.badge > 0) && (
                    <span className="w-4 h-4 rounded-full bg-[#c6f135] text-[#0a0a0a] font-bold text-[9px] flex items-center justify-center font-mono animate-pulse">
                      {link.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#c6f135] shadow-[0_0_8px_#c6f135] rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right: Actions & User Info */}
          <div className="flex items-center space-x-3 shrink-0">
            {isAuthenticated ? (
              <>
                {/* Settings & Key indicator */}
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all cursor-pointer ${
                    hasKey
                      ? 'bg-[#c6f135]/10 border-[#c6f135]/30 text-[#c6f135]'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  }`}
                  title={hasKey ? `${(llmConfig?.provider || 'AI').toUpperCase()} configured and active` : 'No API key configured. Click to configure in Settings.'}
                >
                  <KeyRound size={11} />
                  <span>{hasKey ? `${(llmConfig?.provider || 'AI').toUpperCase()} Active` : 'No Key Configured'}</span>
                </button>

                {/* User Pill */}
                <div className="flex items-center space-x-2 bg-[#141414] border border-[#2a2a2a] pl-2.5 pr-1 py-1 rounded-full">
                  <div className="w-6 h-6 rounded-full bg-[#c6f135] text-[#0a0a0a] font-bold text-xs flex items-center justify-center">
                    {user?.username?.charAt(0).toUpperCase() || <User size={12} />}
                  </div>
                  <span className="text-xs font-mono font-semibold text-white max-w-[90px] truncate pr-1">
                    {user?.username}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1 text-[#777] hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold text-xs flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(198,241,53,0.3)] cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight size={13} />
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-gray-400 hover:text-white bg-[#141414] border border-[#2a2a2a] rounded-lg md:hidden"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2a2a2a] bg-[#0a0a0a] px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.to}
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (!link.isHash) {
                  e.preventDefault();
                  navigate(link.to);
                }
              }}
              className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-[#c6f135] hover:bg-[#141414] transition-colors"
            >
              {link.label}
            </a>
          ))}
          {isAuthenticated && (
            <div className="pt-3 border-t border-[#2a2a2a] flex items-center justify-between">
              <span className="text-xs font-mono text-[#a0a0a0]">Signed in as: <strong className="text-white">{user?.username}</strong></span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-red-400 font-bold hover:underline"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
