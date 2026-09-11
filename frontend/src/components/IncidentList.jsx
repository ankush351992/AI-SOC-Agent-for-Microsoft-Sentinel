import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Clock, Calendar, User, UserCheck } from 'lucide-react';
import { formatDateTime, formatRelativeTime, getUserTimezone } from '../utils/timezone';

export default function IncidentList({
  incidents,
  selectedIncident,
  onSelectIncident,
  filterSeverity,
  setFilterSeverity,
  filterStatus,
  setFilterStatus,
  filterDays,
  setFilterDays,
  searchQuery,
  setSearchQuery,
  loading
}) {
  const [tz, setTz] = useState(getUserTimezone());

  useEffect(() => {
    const handleTzChange = (e) => {
      setTz(e.detail?.timezone || getUserTimezone());
    };
    window.addEventListener('sentinel:timezone-changed', handleTzChange);
    return () => window.removeEventListener('sentinel:timezone-changed', handleTzChange);
  }, []);

  const getSeverityBadge = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'high':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'active':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'closed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = inc.title?.toLowerCase().includes(q);
      const matchNumber = String(inc.incidentNumber).includes(q);
      const matchDesc = inc.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchNumber && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[760px] transition-colors duration-200">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Sentinel Incidents Queue</h2>
          </div>
          <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {filteredIncidents.length} alerts
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search incident #, title, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-1.5">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-1.5 py-1 text-[11px] text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-1.5 py-1 text-[11px] text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={filterDays}
            onChange={(e) => setFilterDays(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-1.5 py-1 text-[11px] text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="All">All Time</option>
            <option value="1">Last 24h</option>
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Incident Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading Sentinel incidents...</div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No matching incidents found.</div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3.5 cursor-pointer transition-all hover:bg-slate-100/70 dark:hover:bg-slate-800/40 ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-600/10 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                      #{inc.incidentNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getSeverityBadge(
                        inc.severity
                      )}`}
                    >
                      {inc.severity}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {inc.classification && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                          inc.classification === 'TruePositive'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                            : inc.classification === 'FalsePositive'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : inc.classification === 'BenignPositive'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30'
                        }`}
                        title={`Classification: ${inc.classification}${inc.classificationReason ? ` (${inc.classificationReason})` : ''}`}
                      >
                        {inc.classification === 'TruePositive' && 'TP'}
                        {inc.classification === 'FalsePositive' && 'FP'}
                        {inc.classification === 'BenignPositive' && 'BP'}
                        {inc.classification === 'Undetermined' && 'UND'}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${getStatusBadge(
                        inc.status
                      )}`}
                    >
                      {inc.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-relaxed mb-1.5">
                  {inc.title}
                </h3>

                {/* Incident Date & Time */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono mb-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center space-x-1 truncate" title={`Created: ${formatDateTime(inc.createdTimeUtc, tz, 'full')}`}>
                    <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="truncate">{formatDateTime(inc.createdTimeUtc, tz, 'medium')}</span>
                  </div>
                  {inc.createdTimeUtc && (
                    <div className="flex items-center space-x-0.5 text-[9px] text-slate-400 dark:text-slate-500 shrink-0 ml-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatRelativeTime(inc.createdTimeUtc)}</span>
                    </div>
                  )}
                </div>

                {/* MITRE Tactics & Entities info & Assignee */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1.5 flex-wrap">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    {inc.assignedTo ? (
                      <span className="flex items-center space-x-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-medium border border-emerald-500/20 max-w-[130px] truncate" title={`Assigned to ${inc.assignedTo}`}>
                        <UserCheck className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{inc.assignedTo}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-0.5 text-slate-400 dark:text-slate-500 text-[9px] italic">
                        <span>Unassigned</span>
                      </span>
                    )}

                    {inc.tactics?.slice(0, 1).map((tactic, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-200 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-mono border border-slate-300 dark:border-slate-700"
                      >
                        {tactic}
                      </span>
                    ))}
                    {inc.tactics?.length > 1 && (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">+{inc.tactics.length - 1}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {inc.entities?.length || 0} entities
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
