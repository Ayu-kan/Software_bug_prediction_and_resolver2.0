import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileSearch, Settings, LogOut, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Sidebar = () => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/analysis', icon: <FileSearch size={20} />, label: 'Repository Analysis' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <aside className="w-64 glass border-r flex flex-col justify-between h-full">
      <div>
        <div className="p-6 flex items-center space-x-3 text-primary">
          <ShieldAlert size={28} className="text-destructive" />
          <span className="text-lg font-semibold tracking-tight">Bug Risk Intel</span>
        </div>
        <nav className="mt-4 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 rounded-lg">
          <div className="truncate">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
