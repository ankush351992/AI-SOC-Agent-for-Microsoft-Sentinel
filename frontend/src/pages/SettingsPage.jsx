import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  RefreshCw,
  Key,
  Save,
  Globe,
  Sliders,
  ShieldAlert,
  Lock,
  Eye,
  Cpu,
  Bot,
  Sparkles,
  UserCheck,
  Clock
} from 'lucide-react';
import { settingsApi } from '../services/api';
import { SUPPORTED_TIMEZONES, getUserTimezone, setUserTimezone, formatDateTime, getTimezoneShortLabel } from '../utils/timezone';

export default function SettingsPage({ user }) {
  const [activeTz, setActiveTz] = useState(getUserTimezone());
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [status, setStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

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
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(now);
        setCurrentTimeStr(`${timeFormatted} (${getTimezoneShortLabel(activeTz)})`);
      } catch (e) {
        setCurrentTimeStr('');
      }
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [activeTz]);

  const handleTimezoneChange = (newTz) => {
    setActiveTz(newTz);
    setUserTimezone(newTz);
  };

  // Form State
  const [formData, setFormData] = useState({
    // Azure
    azure_subscription_id: '',
    azure_resource_group_name: '',
    azure_workspace_name: '',
    azure_tenant_id: '',
    azure_client_id: '',
    azure_client_secret: '',
    use_managed_identity: false,

    // Threat Intel
    enable_microsoft_ti: true,
    mdti_api_key: '',
    abuseipdb_api_key: '',
    virustotal_api_key: '',

    // LLM Keys & Routing Policy
    llm_provider: 'azure_openai',
    azure_openai_endpoint: '',
    azure_openai_api_key: '',
    azure_openai_deployment_name: 'gpt-4o',
    openai_api_key: '',
    llm_routing_mode: 'hybrid',
    fast_model_name: 'gpt-4o-mini',
    reasoning_model_name: 'gpt-6-astra',

    // Toggles
    demo_mode: true,
    auto_post_comments: true,
    auto_close_fps: false
  });

  const isAdmin = user?.role === 'admin' || status?.is_admin === true;

  const fetchStatus = async () => {
    try {
      const data = await settingsApi.getStatus();
      setStatus(data);
      setFormData({
        azure_subscription_id: data.azure_sentinel?.subscription_id || '',
        azure_resource_group_name: data.azure_sentinel?.resource_group || '',
        azure_workspace_name: data.azure_sentinel?.workspace_name || '',
        azure_tenant_id: data.azure_sentinel?.tenant_id || '',
        azure_client_id: data.azure_sentinel?.client_id || '',
        azure_client_secret: '',
        use_managed_identity: data.azure_sentinel?.managed_identity || false,

        enable_microsoft_ti: data.threat_intelligence?.microsoft_ti_enabled ?? true,
        mdti_api_key: data.threat_intelligence?.mdti_api_key || '',
        abuseipdb_api_key: data.threat_intelligence?.abuseipdb_api_key || '',
        virustotal_api_key: data.threat_intelligence?.virustotal_api_key || '',

        llm_provider: data.llm_engine?.provider || 'azure_openai',
        azure_openai_endpoint: data.llm_engine?.endpoint || '',
        azure_openai_api_key: '',
        azure_openai_deployment_name: data.llm_engine?.deployment || 'gpt-4o',
        openai_api_key: '',
        llm_routing_mode: data.llm_engine?.routing_mode || 'hybrid',
        fast_model_name: data.llm_engine?.fast_model || 'gpt-4o-mini',
        reasoning_model_name: data.llm_engine?.reasoning_model || 'gpt-6-astra',

        demo_mode: data.demo_mode ?? true,
        auto_post_comments: data.auto_triage?.auto_post_comments ?? true,
        auto_close_fps: data.auto_triage?.auto_close_fps ?? false
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    if (!isAdmin) {
      alert("Access Denied: Only SOC Admins are authorized to save configuration changes.");
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    try {
      await settingsApi.updateSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      await fetchStatus();
    } catch (err) {
      alert("Failed to save settings: " + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setTesting(true);
    setDiagnostics(null);
    try {
      const res = await settingsApi.testConnection();
      setDiagnostics(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading system configuration...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Azure Sentinel & Agent Settings</h1>
            {!isAdmin && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Read-Only / Test Access</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Infrastructure connectivity, Microsoft & Third-Party Threat Intel, and diagnostic health testing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Diagnostics Test Button - Available to ALL users */}
          <button
            onClick={handleRunDiagnostics}
            disabled={testing}
            className="flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing Services...' : 'Run Diagnostics Self-Test'}</span>
          </button>

          {/* Save Button - Admin Only */}
          {isAdmin && (
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-Admin Analyst Notice */}
      {!isAdmin && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
          <div className="flex items-center space-x-2.5">
            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>SOC Analyst View:</strong> You have full permission to view service status and run <strong>Diagnostics Self-Tests</strong>. To modify Azure subscriptions or API keys, log in with the SOC Admin account.
            </span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between transition-all">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
            <CheckCircle className="w-4 h-4" />
            <span>Configuration updated successfully! Microsoft Threat Intel & Sentinel parameters are active.</span>
          </div>
        </div>
      )}

      {/* Diagnostics Health Banner */}
      {diagnostics && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/30 rounded-xl p-4 transition-colors">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs mb-2">
            <CheckCircle className="w-4 h-4" />
            <span>Diagnostic Health Check: {diagnostics.overall_health}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Log Analytics KQL:</span>
              <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                {diagnostics.diagnostics?.log_analytics_kql?.status}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Sentinel API:</span>
              <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                {diagnostics.diagnostics?.sentinel_api?.status}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Microsoft Defender TI:</span>
              <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                {diagnostics.diagnostics?.threat_intel?.microsoft_defender_ti}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Third-Party TI:</span>
              <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                {diagnostics.diagnostics?.threat_intel?.abuseipdb}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 0: User Profile & Timezone Settings (Full Width) */}
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">User Profile & Time Zone Preferences</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Configure your preferred operational time zone for incident queues, alert timestamps, and forensic reports.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
              {getTimezoneShortLabel(activeTz)} ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Active User Profile
              </label>
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>{user?.username || 'Analyst'}</span>
                <span className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold">{user?.role || 'SOC Admin'}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>Operational Time Zone</span>
                <Globe className="w-3.5 h-3.5 text-blue-500" />
              </label>
              <select
                value={activeTz}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
              >
                {SUPPORTED_TIMEZONES.map((tzOpt) => (
                  <option key={tzOpt.value} value={tzOpt.value}>
                    {tzOpt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Time Preview ({getTimezoneShortLabel(activeTz)})</span>
              </label>
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between">
                <span className="truncate">{currentTimeStr || 'Calculating...'}</span>
                <span className="text-[10px] text-slate-400 font-normal">Real-time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Microsoft Threat Intelligence (MDTI / Sentinel Feed) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Microsoft Threat Intelligence</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">MDTI & Sentinel ThreatIntelligenceIndicator</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              formData.enable_microsoft_ti ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
            }`}>
              {formData.enable_microsoft_ti ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Enable Microsoft Threat Intelligence Integration</div>
                <div className="text-[11px] text-slate-500">Correlates IOCs with Microsoft Defender TI & Sentinel STIX/TAXII feeds</div>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={formData.enable_microsoft_ti}
                onChange={(e) => setFormData({ ...formData, enable_microsoft_ti: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Microsoft Defender TI (MDTI) API Key / Secret (Optional)
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  disabled={!isAdmin}
                  value={formData.mdti_api_key}
                  onChange={(e) => setFormData({ ...formData, mdti_api_key: e.target.value })}
                  placeholder={isAdmin ? "e.g. mdti-api-secret (Uses Azure Workload Identity if blank)" : "•••••••••••••••• (Managed by SOC Admin)"}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Attribution to tracked nation-state threat actors (Midnight Blizzard, Forest Blizzard, Volt Typhoon).
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Third-Party Threat Intelligence (AbuseIPDB & VirusTotal) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Third-Party Threat Intel (TI)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">AbuseIPDB & VirusTotal reputation feeds</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold">
              {status?.threat_intelligence?.status}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                AbuseIPDB API Key
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  disabled={!isAdmin}
                  value={formData.abuseipdb_api_key}
                  onChange={(e) => setFormData({ ...formData, abuseipdb_api_key: e.target.value })}
                  placeholder={isAdmin ? "e.g. 7f89a8c... (Leave blank for simulation)" : "•••••••••••••••• (Managed by SOC Admin)"}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Queries IP abuse confidence scores, country origin, and reports.</p>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                VirusTotal API Key
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  disabled={!isAdmin}
                  value={formData.virustotal_api_key}
                  onChange={(e) => setFormData({ ...formData, virustotal_api_key: e.target.value })}
                  placeholder={isAdmin ? "e.g. 8b9f012... (Leave blank for simulation)" : "•••••••••••••••• (Managed by SOC Admin)"}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Queries SHA256/MD5 hashes across 70+ antivirus scan engines.</p>
            </div>
          </div>
        </div>

        {/* Section 3: AI Reasoning Engine & Intelligent Hybrid Model Segregation */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Engine & Model Routing Policy</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Intelligent model segregation between Fast & Reasoning tiers</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-semibold">
              {status?.llm_engine?.status}
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                LLM Provider Engine
              </label>
              <select
                disabled={!isAdmin}
                value={formData.llm_provider}
                onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 disabled:opacity-50 font-medium"
              >
                <option value="azure_openai">Azure OpenAI Service (Private Corporate Deployment)</option>
                <option value="openai">Direct OpenAI API (Standard API Key)</option>
                <option value="simulation">Deterministic Simulation (Offline SOC Heuristic)</option>
              </select>
            </div>

            {/* Model Segregation & Routing Policy */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span>Model Segregation & Routing Strategy</span>
                <span className="text-[10px] font-mono text-indigo-500 font-bold uppercase">
                  {formData.llm_routing_mode === 'hybrid' ? '⚡ Hybrid Active' : formData.llm_routing_mode === 'always_astra' ? '🧠 Astra Only' : '⚡ 4o-mini Only'}
                </span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                <label className={`flex items-start space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  formData.llm_routing_mode === 'hybrid'
                    ? 'border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="routing_mode"
                    value="hybrid"
                    disabled={!isAdmin}
                    checked={formData.llm_routing_mode === 'hybrid'}
                    onChange={() => setFormData({ ...formData, llm_routing_mode: 'hybrid' })}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold flex items-center space-x-1.5">
                      <span>⚡ Intelligent Hybrid Routing (Recommended)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Auto-routes ~80% routine & low-severity alerts to <code className="text-indigo-600 dark:text-indigo-400 font-bold">gpt-4o-mini</code> (fast & low-cost), and escalates ~20% complex multi-stage attacks to <code className="text-purple-600 dark:text-purple-400 font-bold">gpt-6-astra</code> (deep forensic reasoning).
                    </p>
                  </div>
                </label>

                <label className={`flex items-start space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  formData.llm_routing_mode === 'always_mini'
                    ? 'border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="routing_mode"
                    value="always_mini"
                    disabled={!isAdmin}
                    checked={formData.llm_routing_mode === 'always_mini'}
                    onChange={() => setFormData({ ...formData, llm_routing_mode: 'always_mini' })}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold">⚡ Always Fast (gpt-4o-mini)</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Forces all triage through low-latency model for maximum cost savings and sub-second execution.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  formData.llm_routing_mode === 'always_astra'
                    ? 'border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="routing_mode"
                    value="always_astra"
                    disabled={!isAdmin}
                    checked={formData.llm_routing_mode === 'always_astra'}
                    onChange={() => setFormData({ ...formData, llm_routing_mode: 'always_astra' })}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold">🧠 Always Deep Reasoning (gpt-6-astra)</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Forces exhaustive multi-step reasoning and root-cause analysis for every incident.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Fast Tier Model Identifier
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.fast_model_name}
                  onChange={(e) => setFormData({ ...formData, fast_model_name: e.target.value })}
                  placeholder="e.g. gpt-4o-mini"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Reasoning Tier Model Identifier
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.reasoning_model_name}
                  onChange={(e) => setFormData({ ...formData, reasoning_model_name: e.target.value })}
                  placeholder="e.g. gpt-6-astra"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {formData.llm_provider === 'azure_openai' && (
              <>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Azure OpenAI Endpoint URL
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.azure_openai_endpoint}
                    onChange={(e) => setFormData({ ...formData, azure_openai_endpoint: e.target.value })}
                    placeholder="https://your-resource-name.openai.azure.com/"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Azure OpenAI API Key
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      disabled={!isAdmin}
                      value={formData.azure_openai_api_key}
                      onChange={(e) => setFormData({ ...formData, azure_openai_api_key: e.target.value })}
                      placeholder={isAdmin ? "••••••••••••••••" : "Managed by Admin"}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.llm_provider === 'openai' && (
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  OpenAI API Key (sk-...)
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    disabled={!isAdmin}
                    value={formData.openai_api_key}
                    onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                    placeholder={isAdmin ? "sk-..." : "••••••••••••••••"}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Autonomous SOC Automation Toggles */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">SOC Automation & Triage Mode</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Control offline simulation vs live Sentinel sync</p>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Sandbox / Demo Simulation Mode</div>
                <div className="text-[11px] text-slate-500">Operate offline with simulated Sentinel incidents and KQL telemetry</div>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={formData.demo_mode}
                onChange={(e) => setFormData({ ...formData, demo_mode: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Auto Post Comments to Sentinel</div>
                <div className="text-[11px] text-slate-500">Automatically push AI triage assessments to the incident's comments blade</div>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={formData.auto_post_comments}
                onChange={(e) => setFormData({ ...formData, auto_post_comments: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Auto-Close High Confidence False Positives</div>
                <div className="text-[11px] text-slate-500">Automatically close incidents when verdict is FP with over 90% confidence</div>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={formData.auto_close_fps}
                onChange={(e) => setFormData({ ...formData, auto_close_fps: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Microsoft Sentinel Azure Workspace (Full Width) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Microsoft Sentinel & Azure ARM</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Subscription and Log Analytics Workspace coordinates</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
              {status?.azure_sentinel?.status}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Azure Subscription ID
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.azure_subscription_id}
                onChange={(e) => setFormData({ ...formData, azure_subscription_id: e.target.value })}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Resource Group
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.azure_resource_group_name}
                  onChange={(e) => setFormData({ ...formData, azure_resource_group_name: e.target.value })}
                  placeholder="rg-sentinel-prod"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.azure_workspace_name}
                  onChange={(e) => setFormData({ ...formData, azure_workspace_name: e.target.value })}
                  placeholder="law-sentinel-soc"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Service Principal / App Registration Credentials */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Microsoft Entra ID Service Principal (App Registration)
                </span>
                {formData.use_managed_identity && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    AKS Workload Identity Active (Zero-Secret)
                  </span>
                )}
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Azure Tenant ID (Directory ID)
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    disabled={!isAdmin || formData.use_managed_identity}
                    value={formData.azure_tenant_id}
                    onChange={(e) => setFormData({ ...formData, azure_tenant_id: e.target.value })}
                    placeholder={isAdmin ? "00000000-0000-0000-0000-000000000000" : "•••••••••••••••• (Managed by SOC Admin)"}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Azure Client ID (Application ID)
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      disabled={!isAdmin || formData.use_managed_identity}
                      value={formData.azure_client_id}
                      onChange={(e) => setFormData({ ...formData, azure_client_id: e.target.value })}
                      placeholder={isAdmin ? "00000000-0000-0000-0000-000000000000" : "•••••••••••••••• (Managed by SOC Admin)"}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Azure Client Secret (Secret Value)
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      disabled={!isAdmin || formData.use_managed_identity}
                      value={formData.azure_client_secret}
                      onChange={(e) => setFormData({ ...formData, azure_client_secret: e.target.value })}
                      placeholder={isAdmin ? "Enter secret value (Leave blank to keep existing)" : "•••••••••••••••• (Managed by SOC Admin)"}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  id="managedIdentity"
                  disabled={!isAdmin}
                  checked={formData.use_managed_identity}
                  onChange={(e) => setFormData({ ...formData, use_managed_identity: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <label htmlFor="managedIdentity">Use Azure Workload / Managed Identity (AKS)</label>
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
                >
                  {saving ? 'Saving...' : 'Apply & Save Settings'}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
