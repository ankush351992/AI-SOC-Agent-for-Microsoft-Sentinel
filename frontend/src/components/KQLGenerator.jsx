import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Send,
  User,
  Sparkles,
  Copy,
  Check,
  Code2,
  Database,
  ShieldAlert,
  Zap,
  Play,
  Table as TableIcon,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { triageApi } from '../services/api';

export default function KQLGenerator({ incident }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatEndRef = useRef(null);

  // Live KQL Execution State
  const [activeQuery, setActiveQuery] = useState('');
  const [queryTimespan, setQueryTimespan] = useState(24);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

  const entities = incident?.entities || [];
  const targetUser = entities.find(e => e.kind === 'Account')?.upn || entities.find(e => e.kind === 'Account')?.name || 'Target Account';
  const targetIp = entities.find(e => e.kind === 'Ip')?.address || 'Target IP';

  useEffect(() => {
    if (incident) {
      setMessages([
        {
          role: 'assistant',
          content: `### ⚡ Microsoft Sentinel AI KQL Generator
Ready to synthesize and execute optimized KQL hunting queries for **Incident #${incident.incidentNumber || ''}: ${incident.title || ''}**.

**Active Entities in Context:**
- 👤 **Account:** \`${targetUser}\`
- 🌐 **Network IP:** \`${targetIp}\`

You can ask me to write custom hunting queries, click a quick template below, and click **"Run in Portal"** to execute them live against your Log Analytics workspace.`
        }
      ]);
    }
  }, [incident]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customPrompt) => {
    const textToSend = typeof customPrompt === 'string' ? customPrompt : inputMessage;
    if (!textToSend.trim() || isGenerating || !incident) return;

    const userMsg = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsGenerating(true);

    try {
      const res = await triageApi.chat(incident.id, userMsg.content, messages);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.response || 'No KQL query generated.' }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Error generating KQL query from the backend engine.' }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    const match = text.match(/```(?:kql|sql)?\s*([\s\S]*?)```/i);
    const codeToCopy = match ? match[1].trim() : text;
    navigator.clipboard.writeText(codeToCopy);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleExecuteKQL = async (kqlCode) => {
    const cleanCode = kqlCode.replace(/```(?:kql|sql)?/g, '').replace(/```/g, '').trim();
    setActiveQuery(cleanCode);
    setShowResultsModal(true);
    setIsExecuting(true);
    setQueryResults(null);

    try {
      const startTime = performance.now();
      const res = await triageApi.runKqlQuery(cleanCode, queryTimespan);
      const latency = Math.round(performance.now() - startTime);
      setQueryResults({ ...res, client_latency_ms: latency });
    } catch (err) {
      setQueryResults({
        status: 'ERROR',
        error: err.response?.data?.detail || err.message
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const quickTemplates = [
    {
      label: "7-Day Sign-in Baseline",
      icon: Database,
      prompt: `Write a KQL query for SigninLogs to establish a 7-day authentication baseline for user '${targetUser}'. Summarize by IPAddress, Location, ResultType, and ClientAppUsed.`
    },
    {
      label: "Process Lineage & Subprocesses",
      icon: Terminal,
      prompt: `Generate a KQL hunting query on DeviceProcessEvents for processes spawned by PowerShell, CMD, or suspicious parent processes involving user '${targetUser}' or target hosts.`
    },
    {
      label: "C2 Network Egress Volume",
      icon: Zap,
      prompt: `Write a KQL query on CommonSecurityLog or DeviceNetworkEvents to calculate total egress bytes, connection count, and distinct ports to destination IP '${targetIp}'.`
    },
    {
      label: "Defender TI Correlation",
      icon: ShieldAlert,
      prompt: `Write a KQL query joining ThreatIntelligenceIndicator against SecurityAlert for active indicators matching IP '${targetIp}' in the last 90 days.`
    }
  ];

  // Helper to render formatted markdown with specialized KQL code blocks + Run Button
  const renderMessageContent = (content, msgIdx) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('```')) {
        const cleanCode = part.replace(/```(?:kql|sql)?/g, '').replace(/```/g, '').trim();
        const isCopied = copiedIndex === `${msgIdx}-${pIdx}`;
        return (
          <div key={pIdx} className="my-2.5 rounded-lg overflow-hidden border border-blue-500/30 dark:border-blue-500/30 bg-slate-950 font-mono text-xs shadow-md">
            <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[11px] text-blue-400 font-semibold">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>KQL Hunting Query</span>
              </div>
              <div className="flex items-center space-x-2">
                {/* 1-Click Run in Portal */}
                <button
                  type="button"
                  onClick={() => handleExecuteKQL(cleanCode)}
                  className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run in Portal</span>
                </button>

                {/* Copy Query */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(cleanCode, `${msgIdx}-${pIdx}`)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    isCopied
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="p-3.5 text-emerald-300 dark:text-emerald-400 overflow-x-auto whitespace-pre font-mono leading-relaxed selection:bg-blue-600 selection:text-white">
              {cleanCode}
            </pre>
          </div>
        );
      }

      return (
        <div key={pIdx} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </div>
      );
    });
  };

  const primaryTable = queryResults?.tables?.[0];
  const columns = primaryTable?.columns || [];
  const rows = primaryTable?.rows || [];

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[760px] transition-colors duration-200 relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Sentinel AI KQL Generator & Live Runner</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                Live Portal Execution Ready
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Synthesize queries & execute them directly against Microsoft Sentinel Log Analytics with live data grid output
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((m, idx) => {
          const isBot = m.role === 'assistant';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  isBot
                    ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30'
                    : 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30'
                }`}
              >
                {isBot ? <Terminal className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={`p-3.5 rounded-xl max-w-[88%] leading-relaxed ${
                  isBot
                    ? 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                }`}
              >
                {renderMessageContent(m.content, idx)}
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs italic py-2">
            <Terminal className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            <span>Synthesizing KQL hunting query for Microsoft Sentinel Log Analytics...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Template Prompts */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center">
            <Sparkles className="w-3 h-3 mr-1 text-amber-500" /> Quick KQL:
          </span>
          {quickTemplates.map((tpl, i) => {
            const Icon = tpl.icon || Sparkles;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(tpl.prompt)}
                className="text-[11px] bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-blue-500/50 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 whitespace-nowrap transition-all flex items-center space-x-1.5 shrink-0 shadow-sm"
              >
                <Icon className="w-3 h-3 text-blue-500" />
                <span>{tpl.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Query Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center space-x-2">
        <input
          type="text"
          placeholder="Ask KQL Generator (e.g. Find failed logins followed by success for this user in last 24h)..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
        <button
          type="submit"
          disabled={isGenerating || !inputMessage.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-md shadow-blue-600/20 flex items-center space-x-1.5"
        >
          <span>Generate KQL</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Live KQL Execution Results Modal / Drawer */}
      {showResultsModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90%] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <TableIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Log Analytics Live KQL Execution</h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>Source: <strong className="text-blue-600 dark:text-blue-400 font-mono">{queryResults?.source || 'Microsoft Sentinel'}</strong></span>
                    {queryResults?.row_count !== undefined && (
                      <>
                        <span>•</span>
                        <span>Returned: <strong className="text-emerald-600 dark:text-emerald-400">{queryResults.row_count} rows</strong></span>
                      </>
                    )}
                    {queryResults?.client_latency_ms !== undefined && (
                      <>
                        <span>•</span>
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {queryResults.client_latency_ms}ms</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleExecuteKQL(activeQuery)}
                  disabled={isExecuting}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-spin' : ''}`} />
                  <span>{isExecuting ? 'Running...' : 'Re-run Query'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResultsModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Editable Query Box */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-mono">
              <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                <span>Executed Kusto Query:</span>
                <span className="text-slate-500">Edit and click 'Re-run Query' to refine filter</span>
              </div>
              <textarea
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 text-emerald-400 p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs resize-none"
              />
            </div>

            {/* Table Results View */}
            <div className="flex-1 overflow-auto p-4 text-xs">
              {isExecuting ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-500">
                  <Terminal className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="font-medium">Querying Log Analytics workspace in real-time...</p>
                </div>
              ) : queryResults?.error ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 space-y-1">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>KQL Query Execution Error</span>
                  </div>
                  <p className="text-[11px] font-mono whitespace-pre-wrap">{queryResults.error}</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-slate-400" />
                  <p>Query executed successfully. 0 matching records found within the selected timespan.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      <tr>
                        {columns.map((col, idx) => (
                          <th key={idx} className="p-2.5 font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono text-[11px]">
                      {rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {columns.map((col, cIdx) => {
                            const val = row[col];
                            const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
                            return (
                              <td
                                key={cIdx}
                                className="p-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-xs truncate"
                                title={displayVal}
                              >
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
