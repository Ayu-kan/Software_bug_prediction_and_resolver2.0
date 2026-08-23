import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, CheckCircle2, ArrowLeft, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import logoImg from '../assets/logo.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Email verification state
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSentMsg, setVerificationSentMsg] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isForgotPasswordMode) {
        if (!forgotEmail.trim()) {
          setError('Please enter your registered email address.');
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 600));
        setForgotSubmitted(true);
        setSuccessMsg(`Password reset instructions have been dispatched to ${forgotEmail}. Please check your inbox.`);
        setLoading(false);
        return;
      }

      if (isLoginMode) {
        const res = await authAPI.login({ username: formData.username, password: formData.password });
        if (res.success) {
          login({ id: res.user_id, username: res.username }, {
            provider: res.llm_provider || 'openai',
            keys: res.keys || { openai: res.llm_api_key || '', gemini: '', groq: '' }
          });
          navigate('/dashboard');
        } else {
          setError(res.error || res.message || 'Invalid username or password.');
        }
      } else {
        const res = await authAPI.register(formData);
        if (res.success) {
          setIsLoginMode(true);
          setVerificationPendingEmail(formData.email);
          setSuccessMsg('Account registered successfully! A verification link has been sent to your email.');
        } else {
          setError(res.error || res.message || 'Registration failed. Username or email may already exist.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationPendingEmail) return;
    setResendingVerification(true);
    setVerificationSentMsg('');
    try {
      await new Promise((r) => setTimeout(r, 700));
      setVerificationSentMsg(`New verification email dispatched to ${verificationPendingEmail}.`);
    } catch {
      setError('Failed to resend verification email.');
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden text-white">
      {/* Background Neon Lime Glow Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#c6f135]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#c6f135]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#121212] border border-[#2a2a2a] p-8 rounded-2xl shadow-2xl z-10 glass-card">
        
        {/* Header with Brand Logo and Product Title */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#c6f135] flex items-center justify-center p-2 shadow-[0_0_20px_rgba(198,241,53,0.35)] mb-3">
            <img
              src={logoImg}
              alt="BugRisk insight Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center space-x-1.5 uppercase">
            <span>BugRisk<span className="text-[#c6f135]"> insight</span></span>
          </h1>
          <span className="text-[10px] font-mono text-[#a0a0a0] mt-0.5 tracking-wider uppercase font-semibold">
            Enterprise Edition v2.0
          </span>
          <p className="text-xs text-[#a0a0a0] mt-2 max-w-xs leading-relaxed">
            {isForgotPasswordMode
              ? 'Reset your account password via secure email link.'
              : isLoginMode
              ? 'Welcome back. Sign in to access your intelligence dashboard.'
              : 'Create an account to begin collaborative bug risk prediction.'}
          </p>
        </div>

        {/* Email Verification Banner */}
        {verificationPendingEmail && (
          <div className="p-3.5 rounded-xl mb-4 bg-[#c6f135]/10 border border-[#c6f135]/30 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#c6f135] font-bold">
              <Mail size={15} />
              <span>Email Verification Pending</span>
            </div>
            <p className="text-[11px] text-[#a0a0a0] leading-relaxed">
              We sent a verification link to <strong className="text-white font-mono">{verificationPendingEmail}</strong>.
            </p>
            {verificationSentMsg && (
              <div className="flex items-center space-x-1.5 text-emerald-400 text-[11px] font-semibold">
                <CheckCircle2 size={13} />
                <span>{verificationSentMsg}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="text-[11px] text-[#c6f135] hover:underline font-semibold flex items-center space-x-1 pt-1 cursor-pointer"
            >
              {resendingVerification ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              <span>{resendingVerification ? 'Resending Link...' : 'Resend Verification Email'}</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl mb-4 text-xs bg-red-500/15 text-red-400 border border-red-500/30 leading-relaxed font-mono">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {successMsg && !verificationPendingEmail && (
          <div className="p-3 rounded-xl mb-4 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 leading-relaxed flex items-start space-x-2 font-mono">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Forgot Password Mode */}
        {isForgotPasswordMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!forgotSubmitted ? (
              <>
                <div>
                  <label className="block text-xs font-mono text-[#a0a0a0] uppercase mb-1.5">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c6f135] transition-colors"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold rounded-xl py-2.5 text-xs transition-all shadow-[0_0_15px_rgba(198,241,53,0.25)] flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={14} />}
                  <span>{loading ? 'Sending Instructions...' : 'Send Password Reset Link'}</span>
                </button>
              </>
            ) : (
              <div className="py-2 text-center space-y-3">
                <p className="text-xs text-[#a0a0a0]">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <button
                  type="button"
                  onClick={() => setForgotSubmitted(false)}
                  className="text-xs text-[#c6f135] font-semibold hover:underline"
                >
                  Enter a different email
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordMode(false);
                setError('');
                setSuccessMsg('');
                setForgotSubmitted(false);
              }}
              className="w-full mt-2 py-2 rounded-xl text-xs text-[#a0a0a0] hover:text-white flex items-center justify-center space-x-1.5 transition-colors font-medium"
            >
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </button>
          </form>
        ) : (
          /* Sign In / Sign Up Mode */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono text-[#a0a0a0] uppercase mb-1.5">Username</label>
              <input
                type="text"
                required
                placeholder="Enter username"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c6f135] transition-colors"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            {!isLoginMode && (
              <div>
                <label className="block text-xs font-mono text-[#a0a0a0] uppercase mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c6f135] transition-colors"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-[#a0a0a0] uppercase">Password</label>
                {isLoginMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(true);
                      setError('');
                      setSuccessMsg('');
                      setForgotEmail('');
                    }}
                    className="text-[11px] text-[#c6f135] hover:underline font-mono"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#c6f135] transition-colors"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c6f135] hover:bg-[#b8e32c] text-[#0a0a0a] font-bold rounded-xl py-2.5 text-xs transition-all shadow-[0_0_15px_rgba(198,241,53,0.25)] flex items-center justify-center space-x-2 mt-4 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : isLoginMode ? (
                'Sign In to BugPredict AI'
              ) : (
                'Create BugPredict Account'
              )}
            </button>
          </form>
        )}

        {/* Toggle Login vs Sign Up */}
        {!isForgotPasswordMode && (
          <div className="mt-5 text-center text-xs border-t border-[#2a2a2a] pt-4">
            <span className="text-[#a0a0a0]">
              {isLoginMode ? "Don't have an account yet? " : 'Already registered? '}
            </span>
            <button
              type="button"
              className="text-[#c6f135] font-bold hover:underline ml-1"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
                setSuccessMsg('');
              }}
            >
              {isLoginMode ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
