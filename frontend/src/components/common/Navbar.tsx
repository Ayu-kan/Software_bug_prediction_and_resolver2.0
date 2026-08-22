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
    <header className="sticky top-0 z-40 w-full glass border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand & Workspace Switcher */}
          <div className="flex items-center space-x-4 shrink-0">
            <div className="flex items-center space-x-2.5 cursor-pointer shrink-0" onClick={() => navigate('/')}>
              <img src="/favicon.svg" alt="BugRiskIntel Logo" className="w-8 h-8" />
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight leading-none bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  BugRisk<span className="text-destructive">Intel</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Enterprise v2.0</span>
              </div>
            </div>

            <div className="hidden sm:block h-5 w-px bg-border/60" />

            {/* Workspace Selector Dropdown */}
            <div className="relative hidden sm:block shrink-0">
              <button
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs font-medium transition-all"
              >
                <Building2 size={14} className="text-primary" />
                <span className="max-w-[130px] truncate">
                  {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
                </span>
                {activeWorkspace && (
                  <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[10px] uppercase font-bold">
                    {currentRole}
                  </span>
                )}
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>

              {wsDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setWsDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-64 glass rounded-xl border border-border shadow-2xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Select Active Workspace</p>
                    
                    {/* Personal Option */}
                    <button
                      onClick={() => {
                        setActiveWorkspace(null);
                        setWsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        activeWorkspace === null ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-secondary/60 text-foreground'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <User size={14} />
                        <span>Personal Workspace</span>
                      </div>
                      {activeWorkspace === null && <Check size={14} />}
                    </button>

                    {/* Team Workspaces */}
                    {userWorkspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspace(ws);
                          setWsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          activeWorkspace?.id === ws.id ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-secondary/60 text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Users size={14} />
                          <span className="truncate">{ws.name}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] uppercase font-bold">
                            {ws.role || 'Member'}
                          </span>
                          {activeWorkspace?.id === ws.id && <Check size={14} />}
                        </div>
                      </button>
                    ))}

                    <div className="pt-1 border-t border-border/50">
                      <button
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 flex-1 overflow-x-auto min-w-0 hide-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Profile & Config Chip */}
          <div className="hidden md:flex items-center space-x-3 shrink-0">
            {/* API Key Status Indicator */}
            {hasKey ? (
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono hover:bg-green-500/15 transition-colors cursor-pointer"
                title={`Active AI Key: ${llmConfig?.provider?.toUpperCase() || 'OpenAI'}. Click to configure.`}
              >
                <KeyRound size={12} />
                <span className="capitalize">{llmConfig?.provider || 'AI'} Active</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono hover:bg-yellow-500/15 transition-colors cursor-pointer animate-pulse"
                title="No API Key configured. Click to configure."
              >
                <KeyRound size={12} />
                <span>No API Key</span>
              </button>
            )}

            <div className="h-4 w-px bg-border/60" />

            <div className="flex items-center space-x-2 bg-secondary/40 border border-border/50 pl-2.5 pr-1.5 py-1 rounded-full">
              <div className="flex items-center space-x-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[11px] border border-primary/30">
                  {user?.username?.charAt(0).toUpperCase() || <User size={12} />}
                </div>
                <span className="text-xs font-medium max-w-[100px] truncate">{user?.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
          <div className="pt-2 border-t border-border/50 flex items-center justify-between px-2 py-2">
            <div className="flex items-center space-x-2">
              <User size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-xs text-destructive font-medium px-3 py-1.5 bg-destructive/10 rounded-lg"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
