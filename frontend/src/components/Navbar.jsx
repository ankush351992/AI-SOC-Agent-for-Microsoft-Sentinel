import React, { useState, useEffect } from 'react';
import { Activity, Settings as SettingsIcon, LogOut, UserCheck, Sun, Moon, Globe, Clock } from 'lucide-react';
import { authApi } from '../services/api';
import Logo from './Logo';
import { SUPPORTED_TIMEZONES, getUserTimezone, setUserTimezone, formatDateTime, getTimezoneShortLabel } from '../utils/timezone';

export default function Navbar({ activeTab, setActiveTab, user, theme, toggleTheme }) {
  const [activeTz, setActiveTz] = useState(getUserTimezone());
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [tzMenuOpen, setTzMenuOpen] = useState(false);

  useEffect(() => {
    const handleTzChange = (e) => {
      setActiveTz(e.detail?.timezone || getUserTimezone());
    };
    window.addEventListener('sentinel:timezone-changed', handleTzChange);
    return () => window.removeEventListener('sentinel:timezone-changed', handleTzChange);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      try {
        const timeFormatted = new Intl.DateTimeFormat('en-US', {
          timeZone: activeTz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(now);
        setCurrentTimeStr(`${timeFormatted} ${getTimezoneShortLabel(activeTz)}`);
      } catch (e) {
        setCurrentTimeStr('');
      }
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [activeTz]);

  const handleSelectTimezone = (tzVal) => {
    setActiveTz(tzVal);
    setUserTimezone(tzVal);
    setTzMenuOpen(false);
  };

  return (
    <header className="bg-white/95 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <Logo className="h-8" />
            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-wide">
                  Sentinel AI SOC
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                Incident Triage Agent
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('workbench')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'workbench'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Incident Workbench</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Azure & Agent Settings</span>
            </button>
          </div>

          {/* Timezone Switcher, Theme Toggle, Profile & Logout */}
          <div className="flex items-center space-x-2.5">
            {/* Timezone Selector Dropdown & Live Clock */}
            <div className="relative">
              <button
                onClick={() => setTzMenuOpen(!tzMenuOpen)}
                title="Change User Profile Timezone"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 text-xs font-mono transition-all"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="font-semibold">{getTimezoneShortLabel(activeTz)}</span>
                {currentTimeStr && (
                  <span className="hidden md:inline text-[10px] text-slate-500 font-normal pl-1 border-l border-slate-300 dark:border-slate-700">
                    {currentTimeStr.split(' ')[0]}
                  </span>
                )}
              </button>

              {/* Timezone Dropdown Menu */}
              {tzMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Select Timezone</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono lowercase text-[10px]">{currentTimeStr}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {SUPPORTED_TIMEZONES.map((tzOpt) => {
                      const isCurrent = tzOpt.value === activeTz;
                      return (
                        <button
                          key={tzOpt.value}
                          onClick={() => handleSelectTimezone(tzOpt.value)}
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                            isCurrent
                              ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate pr-2">{tzOpt.label}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                            {tzOpt.short}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 transition-all"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Profile */}
            <div className="flex items-center space-x-2 text-sm bg-slate-100 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-200">{user?.username || 'Analyst'}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{user?.role || 'SOC Lead'}</div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={authApi.logout}
              title="Sign Out"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
