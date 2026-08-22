import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, CheckCircle2, ArrowLeft, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';

const Login = () => {
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
        // Forgot password flow (Frontend Integration Point)
        if (!forgotEmail.trim()) {
          setError('Please enter your registered email address.');
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 600)); // simulated dispatch
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
          navigate('/');
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle Background Glow Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-destructive/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass p-8 rounded-2xl shadow-2xl z-10 border border-border/70 backdrop-blur-xl">
        
        {/* Header with Blue Bug Logo and Product Title */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img src="/favicon.svg" alt="BugRiskIntel Logo" className="w-14 h-14 mb-3 object-contain drop-shadow-md" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-center space-x-1.5">
            <span>BugRisk<span className="text-primary">Intel</span></span>
          </h1>
          <span className="text-[11px] font-mono text-muted-foreground mt-0.5 tracking-wider uppercase font-semibold">
            Enterprise v2.0
          </span>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs">
            {isForgotPasswordMode
              ? 'Reset your account password via secure email link.'
              : isLoginMode
              ? 'Welcome back. Sign in to access your intelligence dashboard.'
              : 'Create an account to begin collaborative bug risk prediction.'}
          </p>
        </div>

        {/* Email Verification Banner */}
        {verificationPendingEmail && (
          <div className="p-3.5 rounded-xl mb-4 bg-primary/10 border border-primary/25 text-xs text-foreground space-y-2">
            <div className="flex items-center space-x-2 text-primary font-bold">
              <Mail size={15} />
              <span>Email Verification Pending</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              We sent a verification link to <strong className="text-foreground font-mono">{verificationPendingEmail}</strong>.
            </p>
            {verificationSentMsg && (
              <div className="flex items-center space-x-1.5 text-green-400 text-[11px] font-semibold">
                <CheckCircle2 size={13} />
                <span>{verificationSentMsg}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="text-[11px] text-primary hover:underline font-semibold flex items-center space-x-1 pt-1"
            >
              {resendingVerification ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              <span>{resendingVerification ? 'Resending Link...' : 'Resend Verification Email'}</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl mb-4 text-xs bg-destructive/15 text-destructive border border-destructive/30 leading-relaxed">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {successMsg && !verificationPendingEmail && (
          <div className="p-3 rounded-xl mb-4 text-xs bg-green-500/15 text-green-400 border border-green-500/30 leading-relaxed flex items-start space-x-2">
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
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Registered Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      className="w-full bg-secondary/50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-4 py-2.5 text-xs transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={14} />}
                  <span>{loading ? 'Sending Instructions...' : 'Send Password Reset Link'}</span>
                </button>
              </>
            ) : (
              <div className="py-2 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <button
                  type="button"
                  onClick={() => setForgotSubmitted(false)}
                  className="text-xs text-primary font-semibold hover:underline"
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
              className="w-full mt-2 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground flex items-center justify-center space-x-1.5 transition-colors font-medium"
            >
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </button>
          </form>
        ) : (
          /* Sign In / Sign Up Mode */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Username</label>
              <input
                type="text"
                required
                placeholder="Enter username"
                className="w-full bg-secondary/50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            {!isLoginMode && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">Password</label>
                {isLoginMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(true);
                      setError('');
                      setSuccessMsg('');
                      setForgotEmail('');
                    }}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-secondary/50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground font-mono"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-4 py-2.5 text-xs transition-all shadow-md flex items-center justify-center space-x-2 mt-4 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : isLoginMode ? (
                'Sign In to BugRiskIntel'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        {/* Toggle Login vs Sign Up */}
        {!isForgotPasswordMode && (
          <div className="mt-5 text-center text-xs border-t border-border/50 pt-4">
            <span className="text-muted-foreground">
              {isLoginMode ? "Don't have an account yet? " : 'Already registered? '}
            </span>
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
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
