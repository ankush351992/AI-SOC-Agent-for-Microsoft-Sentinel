import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { authApi } from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('workbench'); // 'workbench' | 'settings'
  const [loading, setLoading] = useState(true);
  
  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('sentinel_theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sentinel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const token = localStorage.getItem('sentinel_token');
    if (token) {
      authApi.getCurrentUser()
        .then((userData) => {
          setUser(userData);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem('sentinel_token');
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (loginData) => {
    setUser({ username: loginData.username, role: loginData.role });
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070A11] flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xs">
        Initializing Microsoft Sentinel SOC Agent...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070A11] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1">
        {activeTab === 'workbench' && <DashboardPage />}
        {activeTab === 'settings' && <SettingsPage user={user} />}
      </main>
    </div>
  );
}
