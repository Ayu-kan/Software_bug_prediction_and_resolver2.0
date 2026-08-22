import React from 'react';
import { motion } from 'framer-motion';
import { Users, Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Workspaces = () => {
  const { userWorkspaces } = useAuthStore();

  if (userWorkspaces.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-2xl mx-auto"
      >
        <div className="bg-primary/10 p-4 rounded-full text-primary mb-6">
          <Users size={48} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create Your First Workspace</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Workspaces allow you to organize repositories, share analysis reports with your team, and collaborate on bug resolutions.
        </p>
        <button
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all"
        >
          <Plus size={18} />
          <span>Create Workspace</span>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-2">Manage your team workspaces and collaborators.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all">
          <Plus size={16} />
          <span>New Workspace</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userWorkspaces.map(ws => (
          <div key={ws.id} className="glass p-6 rounded-xl border border-border flex flex-col justify-between h-48">
             <div>
                <h3 className="text-xl font-semibold mb-2">{ws.name}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2">{ws.description || 'No description provided.'}</p>
             </div>
             <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
               <span className="px-2 py-1 bg-secondary rounded-md text-xs font-medium uppercase tracking-wider">{ws.role || 'Member'}</span>
               <button className="text-primary text-sm hover:underline">Manage</button>
             </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Workspaces;
