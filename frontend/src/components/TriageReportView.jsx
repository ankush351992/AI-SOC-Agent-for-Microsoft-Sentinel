import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  FileText,
  Crosshair,
  ListChecks,
  Code,
  Check,
  UploadCloud,
  Copy,
  ChevronDown,
  ChevronRight,
  Printer,
  FileDown,
  Edit3,
  Save,
  X,
  Search,
  Terminal,
  Globe,
  Radio,
  Cpu,
  Layers,
  Database,
  Calendar,
  Clock
} from 'lucide-react';
import { incidentsApi, triageApi } from '../services/api';
import { formatDateTime, getUserTimezone, getTimezoneShortLabel } from '../utils/timezone';

export default function TriageReportView({ report: initialReport, incident, onRefresh }) {
  const [tz, setTz] = useState(getUserTimezone());
  const [report, setReport] = useState(initialReport);
  const [isEditing, setIsEditing] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRcaDetails, setShowRcaDetails] = useState(true);

  useEffect(() => {
    const handleTzChange = (e) => {
      setTz(e.detail?.timezone || getUserTimezone());
    };
    window.addEventListener('sentinel:timezone-changed', handleTzChange);
    return () => window.removeEventListener('sentinel:timezone-changed', handleTzChange);
  }, []);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    verdict: 'TRUE_POSITIVE',
    confidence_score: 90,
    executive_summary: '',
    evidence_findings_text: '',
    recommended_actions_text: ''
  });

  useEffect(() => {
    setReport(initialReport);
    if (initialReport) {
      setEditFormData({
        verdict: initialReport.verdict || 'TRUE_POSITIVE',
        confidence_score: initialReport.confidence_score || 90,
        executive_summary: initialReport.executive_summary || '',
        evidence_findings_text: (initialReport.evidence_findings || []).join('\n'),
        recommended_actions_text: (initialReport.recommended_actions || []).join('\n')
      });
    }
  }, [initialReport]);

  if (!report || report.status === 'NOT_TRIAGED') {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center h-[760px] transition-colors duration-200">
        <FileText className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">No Triage Report Generated Yet</h3>
        <p className="text-xs text-slate-500 mt-1">
          Trigger the Autonomous Triage agent to generate an investigation report, Root Cause Analysis (RCA), and MITRE ATT&CK mapping.
        </p>
      </div>
    );
  }

  const getVerdictStyle = (v) => {
    switch (v) {
      case 'TRUE_POSITIVE':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
          icon: <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />,
          label: 'True Positive (Confirmed Threat)',
          color: '#DC2626'
        };
      case 'FALSE_POSITIVE':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
          icon: <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
          label: 'False Positive (Benign Activity)',
          color: '#059669'
        };
      case 'SUSPICIOUS_ESCALATE':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
          label: 'Suspicious / Escalation Advised',
          color: '#D97706'
        };
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
          icon: <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
          label: v,
          color: '#2563EB'
        };
    }
  };

  const verdictMeta = getVerdictStyle(report.verdict);
  const rca = report.root_cause_analysis || {};

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updated = {
        ...report,
        verdict: editFormData.verdict,
        confidence_score: parseInt(editFormData.confidence_score, 10) || 90,
        executive_summary: editFormData.executive_summary,
        evidence_findings: editFormData.evidence_findings_text.split('\n').map(s => s.trim()).filter(Boolean),
        recommended_actions: editFormData.recommended_actions_text.split('\n').map(s => s.trim()).filter(Boolean)
      };

      await triageApi.updateReport(incident.id, updated);
      setReport(updated);
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to save report edits: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const generateReportText = () => {
    const tactics = report.mitre_attack?.tactics?.join(', ') || 'None';
    const techniques = report.mitre_attack?.techniques?.join(', ') || 'None';
    const evidenceList = report.evidence_findings?.map((e, idx) => `${idx + 1}. ${e}`).join('\n') || '- None recorded';
    const actionList = report.recommended_actions?.map((a) => `- [ ] ${a}`).join('\n') || '- None recorded';

    return `# 🛡️ Sentinel AI SOC - Root Cause Analysis (RCA) & Triage Report
Incident: #${incident?.incidentNumber || 'N/A'} - ${incident?.title || 'Security Incident'}
Incident Created: ${formatDateTime(incident?.createdTimeUtc, tz, 'medium')}
Report Generated: ${formatDateTime(new Date().toISOString(), tz, 'medium')}
AI Verdict: ${report.verdict} (${report.confidence_score}% Confidence)
Assessed Severity: ${report.severity_assessment || incident?.severity || 'Medium'}

---
### 1. Executive Summary & Root Cause:
${report.executive_summary}

---
### 2. Patient Zero & Initial Access:
${rca.patient_zero || 'N/A'}
Vector: ${rca.initial_access_vector || 'N/A'}

---
### 3. MITRE ATT&CK Matrix:
Tactics: ${tactics}
Techniques: ${techniques}

---
### 4. Key Forensic Telemetry:
${evidenceList}

---
### 5. Recommended Actions:
${actionList}
`;
  };

  const downloadFile = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadMenuOpen(false);
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(
      {
        incident_metadata: {
          id: incident?.id,
          number: incident?.incidentNumber,
          title: incident?.title,
          createdTime: incident?.createdTimeUtc,
          entities: incident?.entities
        },
        triage_report: report,
        root_cause_analysis: rca,
        exported_at: new Date().toISOString()
      },
      null,
      2
    );
    const fileName = `Sentinel-RCA-Incident-${incident?.incidentNumber || 'Report'}.json`;
    downloadFile(jsonStr, fileName, 'application/json;charset=utf-8');
  };

  // High-Resolution Styled Forensic PDF Export with Low-Level RCA
  const handleDownloadPDF = () => {
    setDownloadMenuOpen(false);
    const tacticsHtml = report.mitre_attack?.tactics?.map(t => `<span class="badge badge-tactic">${t}</span>`).join(' ') || 'None';
    const techniquesHtml = report.mitre_attack?.techniques?.map(t => `<span class="badge badge-technique">${t}</span>`).join(' ') || 'None';
    const evidenceHtml = report.evidence_findings?.map((e, idx) => `
      <div class="evidence-item">
        <span class="evidence-num">#${idx + 1}</span>
        <span class="evidence-text">${e}</span>
      </div>
    `).join('') || '<p>No specific forensic indicators recorded.</p>';

    const actionsHtml = report.recommended_actions?.map(a => `
      <li class="action-item">
        <span class="checkbox">✓</span>
        <span>${a}</span>
      </li>
    `).join('') || '<li>No immediate containment required.</li>';

    const kqlHtml = report.kql_queries_used?.map(q => `
      <pre class="kql-block"><code>${q}</code></pre>
    `).join('') || '<p>No standalone KQL queries recorded.</p>';

    const processTreeHtml = rca.process_tree?.map(p => `
      <div style="background:#F1F5F9; border:1px solid #CBD5E1; padding:8px 10px; border-radius:4px; margin-bottom:6px; font-family:'JetBrains Mono',monospace; font-size:10px;">
        <div><strong>PID ${p.pid}:</strong> <code style="color:#2563EB;">${p.process}</code></div>
        <div style="color:#64748B; word-break:break-all; margin-top:2px;">Command: ${p.command}</div>
        ${p.decoded ? `<div style="margin-top:4px; padding:4px; background:#0B0F19; color:#67E8F9; border-radius:3px;"><strong>Decoded Payload:</strong> ${p.decoded}</div>` : ''}
      </div>
    `).join('') || '<p>No process tree captured.</p>';

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('Please allow popups to generate the PDF report.');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sentinel_RCA_Incident_${incident?.incidentNumber || 'Report'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Inter', sans-serif; color: #0F172A; background: #FFF; margin: 0; padding: 20px; font-size: 11px; line-height: 1.5; -webkit-print-color-adjust: exact !important; }
    .header-table { width: 100%; border-bottom: 2px solid #0F172A; padding-bottom: 10px; margin-bottom: 14px; }
    .report-meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .meta-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #64748B; }
    .meta-val { font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
    .verdict-card { border: 2px solid ${verdictMeta.color}; background: #F8FAFC; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
    .verdict-title { font-size: 15px; font-weight: 800; color: ${verdictMeta.color}; text-transform: uppercase; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-top: 14px; margin-bottom: 8px; }
    .summary-box { background: #F8FAFC; border-left: 3px solid #3B82F6; padding: 8px 12px; font-size: 11px; border-radius: 0 4px 4px 0; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; font-family: 'JetBrains Mono', monospace; margin-right: 4px; }
    .badge-tactic { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
    .badge-technique { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
    .evidence-item { display: flex; margin-bottom: 4px; padding: 5px 8px; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 4px; }
    .evidence-num { font-weight: 700; color: #2563EB; margin-right: 6px; font-family: 'JetBrains Mono', monospace; }
    .action-list { list-style: none; padding: 0; margin: 0; }
    .action-item { display: flex; align-items: center; padding: 4px 0; }
    .checkbox { display: inline-flex; align-items: center; justify-content: center; width: 12px; height: 12px; border-radius: 2px; background: #10B981; color: #FFF; font-size: 9px; margin-right: 6px; }
    .kql-block { background: #0B0F19; color: #67E8F9; padding: 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 9px; white-space: pre-wrap; }
    .footer { margin-top: 20px; border-top: 1px solid #E2E8F0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #94A3B8; }
  </style>
</head>
<body onload="window.print()">
  <table class="header-table">
    <tr>
      <td>
        <div style="font-size:16px; font-weight:800; color:#0F172A; letter-spacing:-0.5px;">🛡️ SENTINEL <span style="color:#2563EB;">AI</span> SOC</div>
        <div style="font-size:10px; color:#64748B;">Cyber Security Operations Center • Autonomous Forensic RCA Report</div>
      </td>
      <td style="text-align: right; vertical-align: top;">
        <div style="font-size: 10px; font-weight: 700; color: #DC2626;">RESTRICTED // SOC INCIDENT RCA</div>
      </td>
    </tr>
  </table>

  <div class="report-meta-box" style="grid-template-columns: repeat(5, 1fr);">
    <div><div class="meta-label">Incident</div><div class="meta-val">#${incident?.incidentNumber || 'N/A'}</div></div>
    <div><div class="meta-label">Created Time (${getTimezoneShortLabel(tz)})</div><div class="meta-val">${formatDateTime(incident?.createdTimeUtc, tz, 'short')}</div></div>
    <div><div class="meta-label">Assessed Severity</div><div class="meta-val" style="color:${verdictMeta.color}">${report.severity_assessment || incident?.severity || 'Medium'}</div></div>
    <div><div class="meta-label">Patient Zero</div><div class="meta-val">${rca.patient_zero || 'Identified'}</div></div>
    <div><div class="meta-label">Triage Confidence</div><div class="meta-val">${report.confidence_score}%</div></div>
  </div>

  <div class="verdict-card">
    <div><div style="font-size:8px; font-weight:700; color:#64748B;">FORENSIC VERDICT</div><div class="verdict-title">${verdictMeta.label}</div></div>
    <div style="font-size:18px; font-weight:900; font-family:'JetBrains Mono', monospace;">${report.confidence_score}%</div>
  </div>

  <div class="section-title">2. Patient Zero & Initial Attack Vector</div>
  <p><strong>Vector:</strong> ${rca.initial_access_vector || incident?.description || 'Security anomaly detected by Sentinel analytic rule.'}</p>

  ${rca.process_tree && rca.process_tree.length > 0 ? `
  <div class="section-title">3. Low-Level Process Lineage & Subprocess Execution Tree</div>
  ${processTreeHtml}
  ` : ''}

  ${rca.network_c2_telemetry?.destination_ip && rca.network_c2_telemetry?.destination_ip !== 'No External C2 Observed' ? `
  <div class="section-title">4. Network Egress & C2 Telemetry</div>
  <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:8px 10px; border-radius:4px; font-family:'JetBrains Mono', monospace; font-size:10px;">
    <div><strong>Destination IP / Endpoint:</strong> ${rca.network_c2_telemetry.destination_ip}:${rca.network_c2_telemetry.port || 443} (${rca.network_c2_telemetry.protocol || 'HTTPS'})</div>
    <div><strong>Reputation / Category:</strong> ${rca.network_c2_telemetry.reputation || 'Correlated Network Node'}</div>
    <div><strong>Data Transferred:</strong> ${rca.network_c2_telemetry.bytes_transferred || 'Telemetry Stream'}</div>
  </div>
  ` : ''}

  <div class="section-title">5. MITRE ATT&CK Alignment</div>
  <div style="margin-bottom:4px;"><strong>Tactics:</strong> ${tacticsHtml}</div>
  <div><strong>Techniques:</strong> ${techniquesHtml}</div>

  <div class="section-title">6. Key Forensic Evidence Findings</div>
  ${evidenceHtml}

  <div class="section-title">7. Corrective & Preventive Action Plan (CAPA)</div>
  <ul class="action-list">${actionsHtml}</ul>

  <div class="footer">
    <span>Sentinel AI SOC • Autonomous RCA Report</span>
    <span>Official Forensic Investigation Record</span>
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCopyToClipboard = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloseAsFalsePositive = async () => {
    try {
      await incidentsApi.updateStatus(incident.id, {
        status: 'Closed',
        classification: 'FalsePositive',
        classification_reason: 'InaccurateData',
        labels: ['AI-Triaged-FP', 'AutoClosed']
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePushCommentToSentinel = async () => {
    try {
      const summaryMsg = `### 🤖 Sentinel AI Triage Assessment\n**Verdict:** ${report.verdict} (${report.confidence_score}% confidence)\n**Executive Summary:** ${report.executive_summary}\n**Recommended Actions:**\n` + report.recommended_actions.map(a => `- ${a}`).join('\n');
      await incidentsApi.addComment(incident.id, summaryMsg);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[760px] transition-colors duration-200">
      {/* Verdict Header Banner */}
      <div className={`p-5 border-b ${verdictMeta.bg} flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          {verdictMeta.icon}
          <div>
            <div className="text-xs uppercase font-mono font-bold tracking-wider opacity-80">
              AI Triage & Forensic RCA
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{verdictMeta.label}</div>
          </div>
        </div>

        {/* Confidence Meter & Top Actions */}
        <div className="flex items-center space-x-3">
          {/* Edit / Save Report Button */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Edit Report</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Edits'}</span>
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {/* Main PDF Export Button */}
          <button
            onClick={handleDownloadPDF}
            title="Download / Print PDF RCA Report"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-red-600/20 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export RCA PDF</span>
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {downloadMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={handleDownloadPDF}
                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2 font-medium"
                >
                  <FileDown className="w-3.5 h-3.5 text-red-500" />
                  <span>Download RCA PDF (.pdf)</span>
                </button>
                <button
                  onClick={handleDownloadJSON}
                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                >
                  <Code className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Download Raw JSON (.json)</span>
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2 border-t border-slate-200 dark:border-slate-800"
                >
                  <Copy className="w-3.5 h-3.5 text-purple-500" />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-right pl-2 border-l border-slate-300/40 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Confidence</div>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
              {report.confidence_score}%
            </div>
          </div>
        </div>
      </div>

      {/* Report Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {isEditing ? (
          /* Editable In-Portal Form */
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-700 dark:text-blue-300 flex items-center space-x-2">
              <Edit3 className="w-4 h-4 shrink-0" />
              <span><strong>Analyst In-Portal Edit Mode:</strong> Modify assessment findings, adjust verdict, or update recommended actions directly.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adjust Verdict
                </label>
                <select
                  value={editFormData.verdict}
                  onChange={(e) => setEditFormData({ ...editFormData, verdict: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-semibold text-slate-900 dark:text-slate-100 focus:border-blue-500"
                >
                  <option value="TRUE_POSITIVE">True Positive (Confirmed Incident)</option>
                  <option value="FALSE_POSITIVE">False Positive (Benign Activity)</option>
                  <option value="SUSPICIOUS_ESCALATE">Suspicious / Escalation Required</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confidence Score (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editFormData.confidence_score}
                  onChange={(e) => setEditFormData({ ...editFormData, confidence_score: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Executive Summary & Root Cause
              </label>
              <textarea
                rows={4}
                value={editFormData.executive_summary}
                onChange={(e) => setEditFormData({ ...editFormData, executive_summary: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-sans leading-relaxed focus:border-blue-500"
                placeholder="Enter executive investigation summary..."
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Key Forensic Evidence Findings (One per line)
              </label>
              <textarea
                rows={4}
                value={editFormData.evidence_findings_text}
                onChange={(e) => setEditFormData({ ...editFormData, evidence_findings_text: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs focus:border-blue-500"
                placeholder="Evidence indicator #1&#10;Evidence indicator #2..."
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recommended Containment Actions (One per line)
              </label>
              <textarea
                rows={3}
                value={editFormData.recommended_actions_text}
                onChange={(e) => setEditFormData({ ...editFormData, recommended_actions_text: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-sans focus:border-blue-500"
                placeholder="Action item #1&#10;Action item #2..."
              />
            </div>
          </div>
        ) : (
          /* Standard View Mode */
          <>
            {/* Executive Summary */}
            <div className="bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>1. Executive Summary & Root Cause Assessment</span>
              </h4>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">{report.executive_summary}</p>
            </div>

            {/* Low-Level Root Cause Analysis (RCA) Deep-Dive Card */}
            <div className="border border-indigo-500/30 bg-slate-50 dark:bg-slate-950/80 rounded-xl overflow-hidden shadow-sm">
              <div
                onClick={() => setShowRcaDetails(!showRcaDetails)}
                className="p-3.5 bg-gradient-to-r from-indigo-950/40 to-slate-900/40 border-b border-indigo-500/20 flex items-center justify-between cursor-pointer hover:bg-indigo-950/60 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    2. Low-Level Forensic Root Cause Analysis (RCA)
                  </h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    Deep Forensics
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-slate-400 text-xs">
                  <span>{showRcaDetails ? 'Collapse' : 'Expand'}</span>
                  {showRcaDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </div>
              </div>

              {showRcaDetails && (
                <div className="p-4 space-y-4 text-xs">
                  {/* Patient Zero & Initial Access */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Patient Zero Target</div>
                      <div className="text-xs font-mono font-semibold text-red-600 dark:text-red-400 mt-1">
                        {rca.patient_zero || 'Target User on Target Workstation'}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Initial Attack Vector</div>
                      <div className="text-xs text-slate-800 dark:text-slate-200 mt-1">
                        {rca.initial_access_vector || 'Weaponized phishing attachment / macro payload.'}
                      </div>
                    </div>
                  </div>

                  {/* Process Execution Tree (Parent -> Child -> Decoded Payload) */}
                  {rca.process_tree && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center space-x-1.5">
                        <Terminal className="w-3.5 h-3.5 text-blue-500" />
                        <span>Process Execution Lineage & Subprocess Tree</span>
                      </div>
                      <div className="space-y-2">
                        {rca.process_tree.map((p, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 font-mono text-[11px] space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded font-bold">PID {p.pid}</span>
                              <strong className="text-slate-900 dark:text-white">{p.process}</strong>
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 text-[10px] break-all">
                              <code>{p.command}</code>
                            </div>
                            {p.decoded && (
                              <div className="mt-1.5 p-2 rounded bg-slate-950 border border-slate-800 text-emerald-400 text-[10px] break-all leading-relaxed">
                                <span className="text-slate-400 font-bold block mb-0.5">🔓 Decoded Base64 Payload:</span>
                                <code>{p.decoded}</code>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* C2 Network Egress & Blast Radius */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
                        <Globe className="w-3 h-3 text-blue-400" />
                        <span>C2 Network / Origin Telemetry</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        Origin / Dest IP: <strong>{rca.network_c2_telemetry?.destination_ip || 'No External IP'}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Category: {rca.network_c2_telemetry?.reputation || 'Cloud Activity / Audit Event'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Protocol: {rca.network_c2_telemetry?.protocol || 'HTTPS'}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
                        <Database className="w-3 h-3 text-purple-400" />
                        <span>Assessed Blast Radius & Scope</span>
                      </div>
                      <div className="text-[11px] text-slate-800 dark:text-slate-200">
                        Targeted Identities: <strong>{rca.blast_radius?.compromised_identities?.join(', ') || 'Directory Entity'}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Affected Assets: {rca.blast_radius?.targeted_assets?.join(', ') || 'Entra ID Resources'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Risk Level: {rca.blast_radius?.data_loss_risk || 'Contained'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MITRE ATT&CK Mapping */}
            {report.mitre_attack && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>3. MITRE ATT&CK Matrix Alignment</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Tactics</div>
                    <div className="flex flex-wrap gap-1.5">
                      {report.mitre_attack.tactics?.map((t, idx) => (
                        <span
                          key={idx}
                          className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs px-2 py-0.5 rounded font-mono font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Techniques</div>
                    <div className="flex flex-wrap gap-1.5">
                      {report.mitre_attack.techniques?.map((t, idx) => (
                        <span
                          key={idx}
                          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs px-2 py-0.5 rounded font-mono font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Findings */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <ListChecks className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>4. Key Forensic Telemetry & Indicators</span>
              </h4>
              <div className="space-y-2">
                {report.evidence_findings?.map((ev, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 flex items-start space-x-2"
                  >
                    <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">#{idx + 1}</span>
                    <span>{ev}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Actions */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>5. Corrective & Preventive Action Plan (CAPA)</span>
              </h4>
              <div className="space-y-2">
                {report.recommended_actions?.map((act, idx) => (
                  <div
                    key={idx}
                    className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-start space-x-2"
                  >
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KQL Queries Used */}
            {report.kql_queries_used && report.kql_queries_used.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Code className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>6. Executed KQL Hunting Queries</span>
                </h4>
                <div className="space-y-2">
                  {report.kql_queries_used.map((q, idx) => (
                    <pre
                      key={idx}
                      className="bg-slate-900 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-300 dark:border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto"
                    >
                      {q}
                    </pre>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom SOAR Action Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePushCommentToSentinel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Sync RCA to Sentinel</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-red-600/20 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export RCA PDF</span>
          </button>
        </div>

        {report.verdict === 'FALSE_POSITIVE' ? (
          <button
            onClick={handleCloseAsFalsePositive}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Approve & Close as False Positive</span>
          </button>
        ) : (
          <button
            onClick={handlePushCommentToSentinel}
            className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-red-600/20 transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Escalate & Apply Containment</span>
          </button>
        )}
      </div>
    </div>
  );
}
