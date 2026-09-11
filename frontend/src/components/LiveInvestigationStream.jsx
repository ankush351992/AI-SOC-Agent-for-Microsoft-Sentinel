import React, { useEffect, useRef } from 'react';
import { Terminal, Shield, CheckCircle, Database, Search, Cpu, AlertTriangle } from 'lucide-react';

export default function LiveInvestigationStream({ events, isRunning }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'INVESTIGATION_STARTED':
        return <Shield className="w-3.5 h-3.5 text-blue-400" />;
      case 'ENTITIES_EXTRACTED':
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      case 'THREAT_INTEL_CHECK':
      case 'THREAT_INTEL_RESULT':
        return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case 'KQL_EXECUTION':
      case 'KQL_RESULT':
        return <Database className="w-3.5 h-3.5 text-cyan-400" />;
      case 'VERDICT_GENERATED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-[#0B0F19] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[760px]">
      {/* Terminal Title Bar */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-xs font-mono font-medium text-slate-300 ml-2">
            AI Triage Engine // Real-Time Execution Trace
          </span>
        </div>
        {isRunning && (
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[11px] font-mono text-blue-400 font-semibold uppercase tracking-wider">
              Agent Investigating
            </span>
          </div>
        )}
      </div>

      {/* Terminal Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
        {events.length === 0 ? (
          <div className="text-slate-600 text-center py-20 flex flex-col items-center">
            <Terminal className="w-8 h-8 mb-2 opacity-50" />
            <p>Ready to start investigation.</p>
            <p className="text-[11px] text-slate-700 mt-1">Click "Run Autonomous Triage" on any incident.</p>
          </div>
        ) : (
          events.map((evt, idx) => (
            <div
              key={idx}
              className="border-l-2 border-slate-800 pl-3 py-1 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1">
                {getEventIcon(evt.event)}
                <span className="font-semibold uppercase tracking-wider text-slate-300">
                  {evt.event?.replace(/_/g, ' ')}
                </span>
                <span className="text-slate-600 text-[10px]">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed">{evt.message}</p>

              {/* Collapsible Details / Payload */}
              {evt.details && Object.keys(evt.details).length > 0 && (
                <div className="mt-2 bg-slate-950/90 border border-slate-800/80 rounded p-2.5 text-[11px] text-slate-400 overflow-x-auto">
                  {evt.details.query && (
                    <div className="text-cyan-400 mb-1">
                      <span className="text-slate-500">KQL: </span>
                      {evt.details.query}
                    </div>
                  )}
                  {evt.details.verdict && (
                    <div className="text-emerald-400">
                      <span className="text-slate-500">Verdict: </span>
                      {evt.details.verdict} (Confidence: {evt.details.confidence_score}%)
                    </div>
                  )}
                  {evt.details.tables && (
                    <div className="text-slate-400">
                      Retrieved {evt.details.row_count} rows from Log Analytics
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
