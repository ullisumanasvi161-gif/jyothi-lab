import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Phone, Lock, Hash, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState(1); // 1 = request otp, 2 = reset password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError('Please input your registered phone number.');
      return;
    }

    setError('');
    setLoading(true);
    const res = await forgotPassword(phone);

    if (res.success) {
      setSuccess('OTP code generated and dispatched (please see server console logs).');
      setStep(2);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setError('Please fill in all verification fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);
    const res = await resetPassword(phone, otp, newPassword);

    if (res.success) {
      setSuccess('Password updated successfully. Redirecting you to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral-500/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-navy-500/20 blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-coral-500 text-white shadow-lg shadow-coral-500/30">
            <Activity size={24} />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {step === 1 
              ? 'Request a security OTP to verify your account' 
              : 'Enter verification OTP code and specify new password'
            }
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400">
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {step === 1 ? (
          /* Step 1: Request OTP Form */
          <form className="mt-8 space-y-6" onSubmit={handleRequestOtp}>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Phone size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Registered phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-coral-500 py-3 px-4 text-sm font-bold text-white shadow-lg shadow-coral-500/25 hover:bg-coral-600 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Generate Security OTP'
              )}
            </button>
          </form>
        ) : (
          /* Step 2: Reset Password Form */
          <form className="mt-8 space-y-4" onSubmit={handleResetPassword}>
            {/* OTP Code */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Verification OTP
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 sm:text-sm"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-coral-500 py-3 px-4 text-sm font-bold text-white shadow-lg shadow-coral-500/25 hover:bg-coral-600 disabled:opacity-50 transition-all mt-6"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Save Password'
              )}
            </button>
          </form>
        )}

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
