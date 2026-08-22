import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, User, Plus, ShieldCheck, Mail, Check, Building2,
  Copy, CheckCircle2, AlertCircle, X, Clock, ShieldAlert,
  Loader2, Trash2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { workspaceAPI } from '../services/api';
import type { Workspace, WorkspaceInvitation } from '../types';

export const Workspaces: React.FC = () => {
  const {
    user, activeWorkspace, setActiveWorkspace,
    userWorkspaces, setUserWorkspaces, getCurrentRole
  } = useAuthStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Invite states
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // User's incoming invitations
  const [userInvites, setUserInvites] = useState<WorkspaceInvitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Active workspace's pending outgoing invitations (for Admin)
  const [wsPendingInvites, setWsPendingInvites] = useState<WorkspaceInvitation[]>([]);

  const currentRole = getCurrentRole();
  const isAdmin = currentRole === 'admin' || (activeWorkspace && activeWorkspace.owner_id === user?.id);

  // Load workspaces and user invitations
  const loadUserData = async () => {
    if (!user?.id) return;
    try {
      const [wsRes, invitesRes] = await Promise.all([
        workspaceAPI.getUserWorkspaces(user.id),
        workspaceAPI.getPendingInvitations(user.id),
      ]);

      if (wsRes.success && Array.isArray(wsRes.workspaces)) {
        setUserWorkspaces(wsRes.workspaces);
      }
      if (invitesRes.success && Array.isArray(invitesRes.invitations)) {
        setUserInvites(invitesRes.invitations);
      }
    } catch {}
  };

  // Load outgoing invitations if admin of active workspace
  const loadWorkspaceInvites = async () => {
    if (!activeWorkspace?.id || !user?.id || !isAdmin) {
      setWsPendingInvites([]);
      return;
    }
    try {
      const res = await workspaceAPI.getWorkspaceInvitations(activeWorkspace.id, user.id);
      if (res.success && Array.isArray(res.invitations)) {
        setWsPendingInvites(res.invitations);
      }
    } catch {}
  };

  useEffect(() => {
    loadUserData();
  }, [user?.id]);

  useEffect(() => {
    loadWorkspaceInvites();
  }, [activeWorkspace?.id, isAdmin]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newWsName.trim()) return;

    try {
      const res = await workspaceAPI.create({
        name: newWsName.trim(),
        description: newWsDesc.trim(),
        owner_id: user.id,
      });
      if (res.success && res.workspace) {
        const updated = [...userWorkspaces, res.workspace];
        setUserWorkspaces(updated);
        setActiveWorkspace(res.workspace);
        setShowCreateModal(false);
        setNewWsName('');
        setNewWsDesc('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create workspace.');
    }
  };

  const handleSelectWorkspace = (ws: Workspace | null) => {
    setActiveWorkspace(ws);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !activeWorkspace?.id || !inviteQuery.trim()) return;

    setInviteLoading(true);
    setInviteSuccess('');
    setInviteError('');

    try {
      const res = await workspaceAPI.inviteMember({
        workspace_id: activeWorkspace.id,
        invited_by: user.id,
        query: inviteQuery.trim(),
        role: inviteRole,
      });

      if (res.success) {
        setInviteSuccess(res.message || `Invitation dispatched to ${inviteQuery.trim()} as ${inviteRole.toUpperCase()} (Pending approval).`);
        setInviteQuery('');
        loadWorkspaceInvites();
      } else {
        setInviteError(res.error || 'Failed to send invitation.');
      }
    } catch (err: any) {
      setInviteError(err.response?.data?.error || err.response?.data?.message || 'An unexpected error occurred while sending invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRespondInvite = async (inviteId: number, action: 'accept' | 'reject') => {
    if (!user?.id) return;
    setLoadingInvites(true);
    try {
      const res = await workspaceAPI.respondToInvitation(inviteId, { user_id: user.id, action });
      if (res.success) {
        // Remove from list
        setUserInvites(prev => prev.filter(i => i.id !== inviteId));
        // Refresh workspaces
        const wsRes = await workspaceAPI.getUserWorkspaces(user.id);
        if (wsRes.success && Array.isArray(wsRes.workspaces)) {
          setUserWorkspaces(wsRes.workspaces);
          if (action === 'accept') {
            const newlyJoined = wsRes.workspaces.find((w: Workspace) => w.id === res.workspace_id);
            if (newlyJoined) setActiveWorkspace(newlyJoined);
          }
        }
      }
    } catch {} finally {
      setLoadingInvites(false);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    if (!user?.id) return;
    try {
      const res = await workspaceAPI.cancelInvitation(inviteId, user.id);
      if (res.success) {
        setWsPendingInvites(prev => prev.filter(i => i.id !== inviteId));
      }
    } catch {}
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#c6f135]/15 text-[#c6f135] text-[10px] font-mono font-bold uppercase border border-[#c6f135]/30">
              Role-Based Access Control (RBAC)
            </span>
            <span className="text-xs font-mono text-[#a0a0a0]">BugPredict Enterprise v2.0</span>
          </div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white">
            WORKSPACE MANAGEMENT
          </h1>
          <p className="text-sm text-[#a0a0a0] mt-1">
            Organize personal vulnerability scans or collaborate with engineering team members via invitation & approval.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold text-xs flex items-center space-x-2 transition-all shadow-[0_0_15px_rgba(198,241,53,0.25)] shrink-0 w-fit cursor-pointer"
        >
          <Plus size={14} />
          <span>Create Workspace</span>
        </button>
      </div>

      {/* Incoming Invitations Banner (If Any) */}
      {userInvites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[#121212] border-2 border-[#c6f135]/40 shadow-[0_0_20px_rgba(198,241,53,0.12)] space-y-3"
        >
          <div className="flex items-center space-x-2 text-[#c6f135] font-bold text-sm">
            <Mail size={18} />
            <span>Workspace Invitations ({userInvites.length} Pending)</span>
          </div>
          <p className="text-xs text-[#a0a0a0]">
            You have been invited to join the following collaborative workspaces. Review and accept to gain team access:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {userInvites.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Building2 size={15} className="text-[#c6f135]" />
                    <span className="font-bold text-white text-sm">{inv.workspace_name}</span>
                    <span className="px-2 py-0.5 rounded bg-[#1f1f1f] text-[9px] font-mono uppercase font-bold text-[#c6f135]">
                      {inv.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#777]">
                    Invited by <strong className="text-gray-300 font-mono">@{inv.inviter_username}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    disabled={loadingInvites}
                    onClick={() => handleRespondInvite(inv.id, 'accept')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Check size={13} />
                    <span>Accept</span>
                  </button>
                  <button
                    type="button"
                    disabled={loadingInvites}
                    onClick={() => handleRespondInvite(inv.id, 'reject')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#181818] hover:bg-red-500/20 text-[#a0a0a0] hover:text-red-400 border border-[#2a2a2a] text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tabs Switcher: Personal Workspace vs Collaborative Workspaces */}
      <div className="flex space-x-2 border-b border-[#2a2a2a] pb-1">
        <button
          type="button"
          onClick={() => handleSelectWorkspace(null)}
          className={`relative px-5 py-2.5 text-xs font-mono font-bold transition-all flex items-center space-x-2 rounded-t-xl cursor-pointer ${
            activeWorkspace === null
              ? 'text-[#c6f135] bg-[#121212] border-t border-x border-[#2a2a2a]'
              : 'text-[#a0a0a0] hover:text-white hover:bg-[#141414]'
          }`}
        >
          <User size={14} />
          <span>Personal Workspace</span>
          {activeWorkspace === null && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#c6f135] shadow-[0_0_8px_#c6f135]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            if (userWorkspaces.length > 0) {
              handleSelectWorkspace(userWorkspaces[0]);
            } else {
              setShowCreateModal(true);
            }
          }}
          className={`relative px-5 py-2.5 text-xs font-mono font-bold transition-all flex items-center space-x-2 rounded-t-xl cursor-pointer ${
            activeWorkspace !== null
              ? 'text-[#c6f135] bg-[#121212] border-t border-x border-[#2a2a2a]'
              : 'text-[#a0a0a0] hover:text-white hover:bg-[#141414]'
          }`}
        >
          <Users size={14} />
          <span>Collaborative Workspaces ({userWorkspaces.length})</span>
          {activeWorkspace !== null && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#c6f135] shadow-[0_0_8px_#c6f135]" />
          )}
        </button>
      </div>

      {/* Tab 1: Personal Workspace Content */}
      {activeWorkspace === null ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-8 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-[#c6f135]">
                <ShieldCheck size={20} />
                <h3 className="text-xl font-bold text-white">Personal Sandbox Active</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#a0a0a0] max-w-xl leading-relaxed">
                All scans executed in Personal Workspace are isolated to your private account. AI API keys and risk reports remain confidential and are not visible to team members.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-white text-xs font-mono font-bold transition-colors flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Plus size={14} className="text-[#c6f135]" />
              <span>Create Shared Team Space</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card">
              <p className="text-[10px] font-mono text-[#a0a0a0] uppercase font-bold">Access Scope</p>
              <h4 className="text-lg font-bold text-white font-mono mt-1">Single User (Private)</h4>
              <p className="text-xs text-[#777] mt-1">Full Admin privileges</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card">
              <p className="text-[10px] font-mono text-[#a0a0a0] uppercase font-bold">API Key Isolation</p>
              <h4 className="text-lg font-bold text-[#c6f135] font-mono mt-1">Encrypted Session</h4>
              <p className="text-xs text-[#777] mt-1">Stored securely in local state</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card">
              <p className="text-[10px] font-mono text-[#a0a0a0] uppercase font-bold">Collaborative Workspaces</p>
              <h4 className="text-lg font-bold text-white font-mono mt-1">{userWorkspaces.length} Available</h4>
              <p className="text-xs text-[#777] mt-1">Click tab above to switch</p>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Tab 2: Collaborative Workspaces Content */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Active Workspace Banner & Team Management */}
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5">
                <Building2 size={20} className="text-[#c6f135]" />
                <h3 className="text-xl font-bold text-white">{activeWorkspace.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#c6f135]/20 text-[#c6f135] font-mono text-[10px] uppercase font-bold">
                  Your Role: {currentRole}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#a0a0a0] leading-relaxed">
                {activeWorkspace.description || 'Shared team intelligence workspace for collaborative defect review and resolution.'}
              </p>
            </div>

            {/* Invite Code Badge */}
            {activeWorkspace.invite_code && (
              <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] shrink-0">
                <span className="text-[11px] font-mono text-[#a0a0a0]">Invite Code:</span>
                <span className="text-xs font-mono font-bold text-[#c6f135]">{activeWorkspace.invite_code}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeWorkspace.invite_code || '');
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer"
                  title="Copy Invite Code"
                >
                  {copiedLink ? <Check size={14} className="text-[#c6f135]" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userWorkspaces.map((ws) => {
              const isSelected = activeWorkspace?.id === ws.id;
              return (
                <div
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws)}
                  className={`p-5 rounded-2xl bg-[#121212] border transition-all cursor-pointer flex flex-col justify-between h-48 glass-card ${
                    isSelected
                      ? 'border-[#c6f135] shadow-[0_0_20px_rgba(198,241,53,0.15)]'
                      : 'border-[#2a2a2a] hover:border-[#c6f135]/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white text-base truncate">{ws.name}</h4>
                      <span className="px-2 py-0.5 rounded bg-[#1f1f1f] text-[10px] font-mono text-[#a0a0a0] uppercase font-bold">
                        {ws.role || 'Member'}
                      </span>
                    </div>
                    <p className="text-xs text-[#a0a0a0] line-clamp-2 leading-relaxed">
                      {ws.description || 'Collaborative repository bug intelligence workspace.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#2a2a2a] flex items-center justify-between text-xs font-mono">
                    <span className={isSelected ? 'text-[#c6f135] font-bold' : 'text-[#777]'}>
                      {isSelected ? '● Active Space' : 'Click to Switch'}
                    </span>
                    {isSelected && <Check size={14} className="text-[#c6f135]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invite Teammate Section (Admin Controlled) */}
          {isAdmin ? (
            <div className="p-6 rounded-2xl bg-[#121212] border border-[#2a2a2a] glass-card space-y-4">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Mail size={16} className="text-[#c6f135]" />
                  <span>Invite New Team Member</span>
                </h4>
                <p className="text-xs text-[#a0a0a0] mt-0.5">
                  Enter a registered username or email. The member will receive a pending invitation that must be accepted before access is granted.
                </p>
              </div>

              {inviteSuccess && (
                <div className="p-3 rounded-xl bg-[#c6f135]/10 border border-[#c6f135]/30 text-[#c6f135] text-xs font-mono flex items-center space-x-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              {inviteError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center space-x-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="Enter registered username or email"
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                  className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#c6f135]"
                />

                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#c6f135]"
                >
                  <option value="editor">Editor (Run scans + Auto-Fix)</option>
                  <option value="viewer">Viewer (Read-only reports)</option>
                  <option value="admin">Admin (Full Management)</option>
                </select>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold text-xs transition-all shrink-0 cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {inviteLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                  <span>Send Invite →</span>
                </button>
              </form>

              {/* Pending Outgoing Invitations Sub-table */}
              {wsPendingInvites.length > 0 && (
                <div className="pt-4 border-t border-[#2a2a2a] space-y-2">
                  <span className="text-[11px] font-mono text-[#a0a0a0] uppercase font-bold flex items-center space-x-1.5">
                    <Clock size={12} className="text-yellow-400" />
                    <span>Pending Invitations Sent ({wsPendingInvites.length})</span>
                  </span>
                  <div className="space-y-2">
                    {wsPendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-white font-semibold">@{inv.username || inv.email}</span>
                          <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-mono">
                            Pending Approval
                          </span>
                          <span className="text-[11px] text-[#777] font-mono uppercase">{inv.role}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id)}
                          className="text-[#777] hover:text-red-400 text-xs flex items-center space-x-1 cursor-pointer font-mono"
                          title="Revoke Invitation"
                        >
                          <Trash2 size={13} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#121212] border border-[#2a2a2a] text-xs text-[#a0a0a0] flex items-center space-x-2">
              <ShieldCheck size={16} className="text-[#c6f135]" />
              <span>You are an {currentRole.toUpperCase()} in this workspace. Member management is administered by the workspace owner.</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#121212] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Workspace</h3>
            <p className="text-xs text-[#a0a0a0]">
              Create a dedicated workspace to collaborate on repository bug prevention with your team.
            </p>

            <form onSubmit={handleCreateWorkspace} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-[#a0a0a0] uppercase mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payments Engineering"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c6f135]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#a0a0a0] uppercase mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Production microservices bug audit team"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c6f135]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#a0a0a0] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c6f135] text-[#0a0a0a] font-bold text-xs hover:bg-[#b8e32c] cursor-pointer"
                >
                  Create & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Workspaces;
