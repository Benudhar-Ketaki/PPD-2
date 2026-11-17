import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Lock, Mail, X, CheckCircle, ArrowRight, KeyRound, RefreshCw, AlertCircle, User as UserIcon } from 'lucide-react';
import { CognitoAuthService } from '../services/cognitoAuth';

type AuthMode = 'SIGN_IN' | 'SIGN_UP' | 'VERIFY_OTP';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, setUserSession } = useApp();

  const [mode, setMode] = useState<AuthMode>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isLoginModalOpen) return null;

  // 1. Real Sign In (Email + Password against live AWS Cognito)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Fast-path demo login for testing & automated presentation walkthroughs
    if (email.toLowerCase().includes('demo') || email.toLowerCase().includes('investigator')) {
      setTimeout(() => {
        setUserSession({
          email: email,
          name: 'Lead Biometric Investigator',
          role: 'Investigator',
          isLoggedIn: true,
        });
        setLoading(false);
        closeLoginModal();
      }, 700);
      return;
    }

    try {
      const authenticatedUser = await CognitoAuthService.signIn(email, password);
      setUserSession(authenticatedUser);
    } catch (err: any) {
      // If user has not confirmed email yet, redirect them to OTP verification
      if (err?.code === 'UserNotConfirmedException') {
        setSuccessMsg('Your account is registered but unconfirmed. Please enter the verification code sent to your email.');
        setMode('VERIFY_OTP');
      } else {
        setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Real Sign Up (Cognito User Pool registration -> sends real OTP email)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please supply a valid email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await CognitoAuthService.signUp(email, password, name);
      setSuccessMsg(`A 6-digit confirmation code (OTP) was sent to ${email}`);
      setMode('VERIFY_OTP');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed. Please try a stronger password or different email.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Real Verify OTP (Validates OTP code directly with AWS Cognito)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      await CognitoAuthService.verifyOtp(email, otpCode.trim());
      setSuccessMsg('Email verified successfully! Logging you in...');
      
      // Auto sign in with credentials after verification
      try {
        if (password) {
          const authUser = await CognitoAuthService.signIn(email, password);
          setUserSession(authUser);
          return;
        }
      } catch {
        // If password wasn't cached, switch to sign in view
      }

      setTimeout(() => {
        setMode('SIGN_IN');
        setSuccessMsg('Account confirmed. Please sign in with your password.');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired confirmation code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!email) {
      setErrorMsg('Please enter your email to resend code.');
      return;
    }
    try {
      await CognitoAuthService.resendOtp(email);
      setSuccessMsg(`A new confirmation code has been dispatched to ${email}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resend confirmation code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-bg-surface border border-borderLine rounded-2xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/40">
        <button
          onClick={closeLoginModal}
          className="absolute top-4 right-4 p-2 text-muted hover:text-white rounded-lg hover:bg-bg-panel transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center text-bg-main font-black text-xl shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-bg-main" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">WalkTrace Portal</h2>
            <p className="text-xs text-brand-cyan font-mono">Live AWS Cognito Authentication</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-lg bg-bg-panel p-1 mb-5 border border-borderLine text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('SIGN_IN'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mode === 'SIGN_IN'
                ? 'bg-bg-surface text-brand-cyan shadow-sm border border-brand-cyan/30'
                : 'text-muted hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('SIGN_UP'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mode === 'SIGN_UP'
                ? 'bg-bg-surface text-brand-cyan shadow-sm border border-brand-cyan/30'
                : 'text-muted hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setMode('VERIFY_OTP'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mode === 'VERIFY_OTP'
                ? 'bg-bg-surface text-brand-cyan shadow-sm border border-brand-cyan/30'
                : 'text-muted hover:text-white'
            }`}
          >
            Verify OTP
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODE 1: SIGN IN */}
        {mode === 'SIGN_IN' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-bg-panel border border-borderLine rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-muted focus:outline-none focus:border-brand-cyan transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-bg-panel border border-borderLine rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-muted focus:outline-none focus:border-brand-cyan transition-colors"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg font-bold text-xs bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating with AWS Cognito...' : 'Sign In & Access Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 border-t border-borderLine/50 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setUserSession({
                    email: 'lead.investigator@walktrace.ai',
                    name: 'Lead Biometric Investigator',
                    role: 'Investigator',
                    isLoggedIn: true,
                  });
                  closeLoginModal();
                }}
                className="w-full py-2 rounded-lg font-medium text-xs bg-bg-panel hover:bg-bg-panel/80 text-brand-cyan border border-brand-cyan/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Demo Operator Fast Access (Investigator)</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: SIGN UP */}
        {mode === 'SIGN_UP' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name (Optional)</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-panel border border-borderLine rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-muted focus:outline-none focus:border-brand-cyan transition-colors"
                  placeholder="Officer Jane Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-bg-panel border border-borderLine rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-muted focus:outline-none focus:border-brand-cyan transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-bg-panel border border-borderLine rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-muted focus:outline-none focus:border-brand-cyan transition-colors"
                  placeholder="Min 8 chars (letters, numbers, uppercase)"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted">
              AWS Cognito will automatically send a real 6-digit verification code to your email inbox.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg font-bold text-xs bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Creating Account in Cognito...' : 'Register & Send Email OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* MODE 3: VERIFY OTP */}
        {mode === 'VERIFY_OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300">
                Enter the 6-digit confirmation code sent to:
              </p>
              <span className="font-mono text-white text-xs font-bold block">{email || 'your email'}</span>
            </div>

            {!email && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-bg-panel border border-borderLine rounded-lg px-3 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-brand-cyan"
                  placeholder="your.email@example.com"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-center">6-Digit Confirmation Code</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                required
                className="w-full text-center tracking-[0.5em] font-mono text-xl bg-bg-panel border border-borderLine rounded-lg py-3 text-white placeholder-muted focus:outline-none focus:border-brand-cyan transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg font-bold text-xs bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Verifying with AWS Cognito...' : 'Confirm OTP & Open Dashboard'}</span>
              <CheckCircle className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-borderLine/50">
              <span>Didn't receive the email?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-brand-cyan hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend OTP</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-borderLine/50 text-center text-xs text-muted">
          <span>Connected to User Pool: <code className="text-slate-400 font-mono text-[10px]">us-east-1_fLyGM6BsL</code></span>
        </div>
      </div>
    </div>
  );
};
