import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLoginMode) {
        const res = await authAPI.login({ username: formData.username, password: formData.password });
        if (res.success) {
          login({ id: res.user_id, username: res.username });
          navigate('/');
        } else {
          setError(res.error || 'Login failed');
        }
      } else {
        const res = await authAPI.register(formData);
        if (res.success) {
          setIsLoginMode(true);
          setError('Registration successful! Please login.');
        } else {
          setError(res.error || 'Registration failed');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-destructive/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass p-8 rounded-2xl shadow-2xl z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-destructive/10 rounded-full mb-4">
            <ShieldAlert size={32} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bug Risk Intel</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLoginMode ? 'Welcome back. Sign in to your account.' : 'Create an account to get started.'}
          </p>
        </div>

        {error && (
          <div className={`p-3 rounded-md mb-4 text-sm ${error.includes('successful') ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-lg px-4 py-2 mt-6 hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : isLoginMode ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {isLoginMode ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
            }}
          >
            {isLoginMode ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
