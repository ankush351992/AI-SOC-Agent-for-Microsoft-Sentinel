import React from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Zap,
  Bot,
  Flame,
  Calendar,
  Clock,
  RefreshCw,
  TrendingUp,
  Filter
} from 'lucide-react';

const LOOKBACK_OPTIONS = [
  { value: '1', label: 'Last 24h', fullLabel: 'Last 24 Hours', icon: Clock },
  { value: '7', label: 'Last 7d', fullLabel: 'Last 7 Days', icon: Calendar },
  { value: '14', label: 'Last 14d', fullLabel: 'Last 14 Days', icon: Calendar },
  { value: '30', label: 'Last 30d', fullLabel: 'Last 30 Days', icon: Calendar },
  { value: '90', label: 'Last 90d', fullLabel: 'Last 90 Days', icon: Calendar },
  { value: 'All', label: 'All Time', fullLabel: 'All Recorded Incidents', icon: Calendar }
];

export default function StatsOverview({
  stats,
  lookbackDays = 'All',
  onSelectLookback,
  onQuickFilter,
  filterSeverity,
  filterStatus,
  onRefresh,
  loading = false
}) {
  if (!stats) return null;

  const activeOption = LOOKBACK_OPTIONS.find(o => o.value === String(lookbackDays)) || LOOKBACK_OPTIONS[5];

  // Dynamic percentage calculations
  const total = stats.total_incidents || 0;
  const newCount = stats.new_incidents || 0;
  const activeCount = stats.active_incidents || 0;
  const closedCount = stats.closed_incidents || 0;
  const triagedCount = stats.ai_triaged_count || 0;
  const highCount = stats.high_severity || 0;

  const highPercent = total > 0 ? Math.round((highCount / total) * 100) : 0;
  const triagedPercent = total > 0 ? Math.round((triagedCount / total) * 100) : 100;

  return (
    <div className="mb-6 space-y-3">
      {/* Lookback Timeline Control Bar */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors duration-200">
        <div className="flex items-center space-x-2 text-xs">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[10px]">Lookback Window:</span>
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
            {activeOption.fullLabel}
          </span>
          <span className="text-[11px] text-slate-400">
            • {total} incidents in scope
          </span>
        </div>

        {/* Lookback Pill Switchers */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {LOOKBACK_OPTIONS.map((opt) => {
              const isSelected = String(lookbackDays) === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onSelectLookback && onSelectLookback(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium font-mono transition-all flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                  title={`Filter metrics & queue to ${opt.fullLabel}`}
                >
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Live Metrics & Incidents"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-800 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* 5 Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Incidents */}
        <div
          onClick={() => onQuickFilter && onQuickFilter({ severity: 'All', status: 'All' })}
          className="group cursor-pointer bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <span>Total Incidents</span>
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{total}</span>
            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
              {newCount} New
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
            <span>{activeCount} Active • {closedCount} Closed</span>
            <span className="font-mono">{activeOption.label}</span>
          </div>
        </div>

        {/* Metric 2: AI Triaged */}
        <div
          className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI Triaged Alerts</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{triagedCount}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-500 font-semibold font-mono">
              100% Automated
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
            <span>{triagedPercent}% Timeline Coverage</span>
            <span className="font-mono text-emerald-500">Autonomous</span>
          </div>
        </div>

        {/* Metric 3: High/Critical Severity */}
        <div
          onClick={() => onQuickFilter && onQuickFilter({ severity: 'High' })}
          className={`group cursor-pointer bg-white dark:bg-[#111827] border rounded-xl p-4 shadow-sm hover:border-red-400 dark:hover:border-red-500/50 hover:shadow-md transition-all relative overflow-hidden ${
            filterSeverity === 'High' ? 'border-red-500 ring-1 ring-red-500/50' : 'border-slate-200 dark:border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">High / Critical</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">{highCount}</span>
            <span className="text-[11px] text-red-600/90 dark:text-red-400 font-semibold font-mono">
              {highPercent}% of Scope
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
            <span>{highCount > 0 ? 'Requires SOC Action' : 'Zero High Threats'}</span>
            <span className="font-mono text-red-400">{highCount > 0 ? 'Urgent' : 'Clear'}</span>
          </div>
        </div>

        {/* Metric 4: FP Noise Reduction */}
        <div
          onClick={() => onQuickFilter && onQuickFilter({ status: 'Closed' })}
          className="group cursor-pointer bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-cyan-400 dark:hover:border-cyan-500/50 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">FP Noise Reduction</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">{stats.fp_reduction_rate}</span>
            <span className="text-[11px] text-cyan-600/90 dark:text-cyan-400 font-semibold font-mono">
              Suppressed
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
            <span>SOC Alert Fatigue Shield</span>
            <span className="font-mono text-cyan-500">Auto-tuned</span>
          </div>
        </div>

        {/* Metric 5: Average Triage Speed */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Triage Speed</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.avg_triage_time_seconds}s</span>
            <span className="text-[11px] text-amber-600/90 dark:text-amber-500 font-semibold font-mono">
              vs 15m Human
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
            <span>99.4% Latency Reduction</span>
            <span className="font-mono text-amber-500">Real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
}
