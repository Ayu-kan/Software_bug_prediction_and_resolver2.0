import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GitBranch, Settings, LogOut,
  User, Menu, X, KeyRound, Users, History, ChevronDown, Check, Building2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { workspaceAPI } from '../../services/api';
import type { Workspace } from '../../types';

const Navbar = () => {
  const {
    logout, user, llmConfig, activeWorkspace, setActiveWorkspace,
    userWorkspaces, setUserWorkspaces, getActiveApiKey, getCurrentRole
  } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  const activeKey = getActiveApiKey();
  const hasKey = Boolean(activeKey);
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
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/analysis', icon: <GitBranch size={18} />, label: 'Analysis' },
    { to: '/workspaces', icon: <Users size={18} />, label: 'Workspaces' },
    { to: '/history', icon: <History size={18} />, label: 'History' },
    { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-border/50 bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Brand & Workspace Switcher Section */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Logo & Product Title */}
            <div className="flex items-center space-x-2 cursor-pointer select-none" onClick={() => navigate('/')}>
              <img src="/favicon.svg" alt="BugRiskIntel Logo" className="w-7 h-7 object-contain drop-shadow-sm" />
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold tracking-tight leading-none text-foreground">
                  BugRisk<span className="text-primary">Intel</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono mt-0.5 tracking-wide">Enterprise v2.0</span>
              </div>
            </div>

            <div className="hidden lg:block h-5 w-px bg-border/60 mx-1" />

            {/* Workspace Selector Dropdown (Fixed no-overlap layout) */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary border border-border text-xs font-medium transition-all shadow-xs"
              >
                <Building2 size={13} className="text-primary shrink-0" />
                <span className="max-w-[110px] md:max-w-[140px] truncate text-left">
                  {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
                </span>
                {activeWorkspace && (
                  <span className="px-1 py-0.2 rounded bg-primary/20 text-primary text-[9px] uppercase font-bold shrink-0">
                    {currentRole}
                  </span>
                )}
                <ChevronDown size={12} className="text-muted-foreground shrink-0" />
              </button>

              {wsDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWsDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-64 glass rounded-xl border border-border shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Select Active Workspace</p>
                    
                    {/* Personal Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWorkspace(null);
                        setWsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        activeWorkspace === null ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-secondary/60 text-foreground'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <User size={14} className="shrink-0" />
                        <span className="truncate">Personal Workspace</span>
                      </div>
                      {activeWorkspace === null && <Check size={14} className="shrink-0 text-primary" />}
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          activeWorkspace?.id === ws.id ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-secondary/60 text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate min-w-0 pr-1">
                          <Users size={14} className="shrink-0" />
                          <span className="truncate">{ws.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[9px] uppercase font-bold">
                            {ws.role || 'Member'}
                          </span>
                          {activeWorkspace?.id === ws.id && <Check size={14} className="text-primary" />}
                        </div>
                      </button>
                    ))}

                    <div className="pt-1 border-t border-border/50">
                      <button
                        type="button"
                        onClick={() => {
                          setWsDropdownOpen(false);
                          navigate('/workspaces');
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors font-medium"
                      >
                        + Manage Workspaces
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 flex-1 justify-center max-w-md min-w-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/30 shadow-xs'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Profile & Config Chip (Right-aligned, zero overlapping) */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* API Key Status Indicator */}
            {hasKey ? (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-xs font-mono hover:bg-green-500/20 transition-colors cursor-pointer shrink-0"
                title={`Active AI Key: ${llmConfig?.provider?.toUpperCase() || 'OpenAI'}. Click to configure.`}
              >
                <KeyRound size={11} />
                <span className="capitalize text-[11px] font-sans font-semibold">{llmConfig?.provider || 'AI'} Active</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs font-mono hover:bg-yellow-500/20 transition-colors cursor-pointer shrink-0"
                title="No API Key configured. Click to configure."
              >
                <KeyRound size={11} />
                <span className="text-[11px] font-sans font-semibold">No API Key</span>
              </button>
            )}

            <div className="hidden sm:block h-4 w-px bg-border/60 shrink-0" />

            {/* User Profile Pill */}
            <div className="flex items-center space-x-1.5 bg-secondary/50 border border-border/60 pl-2 pr-1 py-1 rounded-full shrink-0">
              <div className="flex items-center space-x-1.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[11px] border border-primary/30 shrink-0">
                  {user?.username?.charAt(0).toUpperCase() || <User size={12} />}
                </div>
                <span className="text-xs font-medium max-w-[80px] sm:max-w-[110px] truncate text-foreground pr-1">
                  {user?.username}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors md:hidden shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg px-4 pt-3 pb-4 space-y-2.5">
          {/* Active Workspace Switcher in Mobile Menu */}
          <div className="pb-2 border-b border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Active Space</p>
            <div className="flex items-center justify-between bg-secondary/40 p-2 rounded-lg text-xs">
              <span className="font-semibold text-foreground truncate">
                {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/workspaces');
                }}
                className="text-primary text-[11px] font-medium hover:underline shrink-0"
              >
                Change
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Mobile API Key Chip & Logout */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/settings');
              }}
              className="text-xs text-primary hover:underline flex items-center space-x-1"
            >
              <KeyRound size={13} />
              <span>{hasKey ? `${llmConfig?.provider?.toUpperCase()} Configured` : 'Configure API Key'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center space-x-1 text-xs text-destructive font-medium px-2.5 py-1 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
