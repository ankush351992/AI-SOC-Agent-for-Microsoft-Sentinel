import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle, Sun, Moon, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { authApi } from '../services/api';
import Logo from '../components/Logo';

export default function LoginPage({ onLoginSuccess, theme, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const data = await authApi.login(username, password);
      onLoginSuccess(data);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.reset_required) {
        setIsResetMode(true);
        setInfoMessage('Initial temporary password verified. Please choose a new permanent password (minimum 8 characters).');
      } else {
        setError(err.response?.data?.detail || 'Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === password) {
      setError('New password must be different from the temporary password.');
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.resetPassword(username, password, newPassword);
      onLoginSuccess(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070A11] flex flex-col items-center justify-center p-4 transition-colors duration-200 relative">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Top-right Theme Switcher */}
      {toggleTheme && (
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/40 shadow-sm transition-all"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white/95 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl transition-colors duration-200">
          {/* Header Logo */}
          <div className="flex flex-col items-center justify-center mb-8 text-center">
            <div className="mb-3">
              <Logo className="h-10" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">Sentinel AI SOC</h1>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Autonomous Incident Triage Platform</p>
          </div>

          {infoMessage && (
            <div className="mb-5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Normal Login Form */}
          {!isResetMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  SOC Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    placeholder="e.g. soc_admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to SOC Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Set New Password Form */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 mb-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Create New Permanent Password</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Account
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled
                    value={username}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400 font-mono opacity-80 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setError(''); setInfoMessage(''); }}
                  className="w-1/3 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center justify-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <span>Save & Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* First-Run Notice */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 text-center space-y-1.5">
            <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-semibold">First-Time Setup Security</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Default accounts (<code className="text-blue-600 dark:text-blue-400">soc_admin</code>, <code className="text-blue-600 dark:text-blue-400">analyst</code>, <code className="text-blue-600 dark:text-blue-400">tier1_analyst</code>) have temporary one-time passwords printed in the backend startup logs. Each user is prompted to set a permanent password upon first login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
