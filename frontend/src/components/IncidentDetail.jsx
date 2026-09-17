import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  User,
  Globe,
  Terminal,
  Play,
  MessageSquare,
  Send,
  Cpu,
  Zap,
  Lock,
  Ban,
  Radio,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCode,
  Link,
  Cloud,
  Mail,
  HardDrive,
  ExternalLink,
  Clock,
  Calendar,
  UserCheck,
  UserPlus,
  Users,
  Check,
  Tag,
  ShieldCheck,
  HelpCircle,
  FileEdit,
  Search,
  Workflow,
  Sliders,
  Layers
} from 'lucide-react';
import { incidentsApi } from '../services/api';
import { formatDateTime, formatRelativeTime, getUserTimezone } from '../utils/timezone';

export default function IncidentDetail({
  incident,
  onRunTriage,
  isTriaging,
  onUpdateIncident
}) {
  const [tz, setTz] = useState(getUserTimezone());
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  
  // Entra ID Users & Incident Assignment State
  const [entraUsers, setEntraUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignNotification, setAssignNotification] = useState(null);

  // Mandatory Closing Classification State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeClassification, setCloseClassification] = useState(incident?.classification || 'TruePositive');
  const [closeReason, setCloseReason] = useState(incident?.classificationReason || 'SuspiciousActivity');
  const [closeComment, setCloseComment] = useState(incident?.classificationComment || '');

  useEffect(() => {
    if (incident) {
      setCloseClassification(incident.classification || 'TruePositive');
      setCloseReason(incident.classificationReason || (incident.classification === 'FalsePositive' ? 'InaccurateData' : incident.classification === 'BenignPositive' ? 'SuspiciousButExpected' : 'SuspiciousActivity'));
      setCloseComment(incident.classificationComment || '');
    }
  }, [incident?.id]);

  useEffect(() => {
    const handleTzChange = (e) => {
      setTz(e.detail?.timezone || getUserTimezone());
    };
    window.addEventListener('sentinel:timezone-changed', handleTzChange);
    return () => window.removeEventListener('sentinel:timezone-changed', handleTzChange);
  }, []);

  // Fetch Entra ID Users once
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await incidentsApi.getEntraUsers();
        if (isMounted && res?.users) {
          setEntraUsers(res.users);
        }
      } catch (err) {
        console.error('Failed to load Entra ID users:', err);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };
    fetchUsers();
    return () => { isMounted = false; };
  }, []);

  // Active Remediation Modal State
  const [remediationModal, setRemediationModal] = useState(null); // { type, title, entity, description }
  const [isRemediating, setIsRemediating] = useState(false);
  const [remediationResult, setRemediationResult] = useState(null);

  const FALLBACK_PLAYBOOKS = [
    {
      id: 'playbook-soar-isolate-endpoint',
      name: 'SOAR-Isolate-Endpoint-LogicApp',
      displayName: 'Isolate Endpoint Device via Defender for Endpoint',
      description: 'Trigger Microsoft Defender for Endpoint automated device network isolation and forensic snapshot preservation.',
      category: 'Containment',
      triggerType: 'Microsoft Sentinel Incident Trigger',
      state: 'Enabled',
      resourceGroup: 'sentinel-demo'
    },
    {
      id: 'playbook-soar-revoke-sessions',
      name: 'SOAR-Revoke-User-Sessions-LogicApp',
      displayName: 'Revoke Entra ID User Sessions & Invalidate Tokens',
      description: 'Invalidates all active refresh tokens and sign-in sessions for compromised accounts in Microsoft Entra ID (Azure AD).',
      category: 'Identity',
      triggerType: 'Microsoft Sentinel Incident Trigger',
      state: 'Enabled',
      resourceGroup: 'sentinel-demo'
    },
    {
      id: 'playbook-soar-block-ip',
      name: 'SOAR-Block-Malicious-IP-LogicApp',
      displayName: 'Block Malicious IP at Azure Perimeter & NSG',
      description: 'Appends malicious origin IP to Azure Perimeter Firewall drop list and pushes indicators to Sentinel Threat Intelligence feed.',
      category: 'Network',
      triggerType: 'Microsoft Sentinel Incident Trigger',
      state: 'Enabled',
      resourceGroup: 'sentinel-demo'
    },
    {
      id: 'playbook-soar-disable-account',
      name: 'SOAR-Disable-Compromised-Account-LogicApp',
      displayName: 'Disable Compromised Account in Microsoft Entra ID',
      description: 'Temporarily disables user account object in Microsoft Entra ID to halt active adversary lateral movement.',
      category: 'Identity',
      triggerType: 'Microsoft Sentinel Incident Trigger',
      state: 'Enabled',
      resourceGroup: 'sentinel-demo'
    },
    {
      id: 'playbook-soar-teams-slack-alert',
      name: 'SOAR-Post-Incident-Teams-Slack-LogicApp',
      displayName: 'Broadcast Incident Triage to SOC Teams / Slack',
      description: 'Posts an interactive investigation card with MITRE ATT&CK tactics, verdict, and response buttons to the #soc-war-room channel.',
      category: 'Notification',
      triggerType: 'Microsoft Sentinel Incident Trigger',
      state: 'Enabled',
      resourceGroup: 'sentinel-demo'
    },
    {
      id: 'playbook-soar-servicenow-ticket',
      name: 'SOAR-Create-ServiceNow-P1-Ticket-LogicApp',
      displayName: 'Create ServiceNow Major Incident (P1/P2) & Sync',
      description: 'Generates a corresponding security incident ticket in ServiceNow ITSM with bidirectional status and comment synchronization.',
      category: 'Ticketing',
      triggerType: 'Microsoft Sentinel Incident Trigger',
      state: 'Enabled',
      resourceGroup: 'sentinel-demo'
    },
    {
      id: 'playbook-soar-full-containment',
      name: 'SOAR-Full-Incident-Containment-Playbook',
      displayName: 'Full Multi-Stage Containment & Forensic Snapshot',
      description: 'Automates simultaneous host isolation, user session revocation, perimeter firewall block, and ticket creation.',
      category: 'Containment',
      triggerType: 'Microsoft Sentinel Incident Trigger',
      state: 'Enabled',
      resourceGroup: 'sentinel-demo'
    },
    {
      id: 'playbook-soar-defender-scan',
      name: 'SOAR-Trigger-Defender-Antivirus-Scan-LogicApp',
      displayName: 'Trigger On-Demand Defender Antivirus Scan',
      description: 'Initiates an immediate full antivirus scan and collects forensic investigation package via Microsoft Defender for Endpoint.',
      category: 'Forensics',
      triggerType: 'Microsoft Sentinel Incident Trigger',
      state: 'Enabled',
      resourceGroup: 'sentinel-demo'
    }
  ];

  // Dedicated Azure Logic Apps / SOAR Playbook Modal State
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [playbooks, setPlaybooks] = useState(FALLBACK_PLAYBOOKS);
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(false);
  const [selectedPlaybookName, setSelectedPlaybookName] = useState('SOAR-Full-Incident-Containment-Playbook');
  const [playbookSearch, setPlaybookSearch] = useState('');
  const [playbookCategory, setPlaybookCategory] = useState('All');
  const [playbookNotes, setPlaybookNotes] = useState('');
  const [isTriggeringPlaybook, setIsTriggeringPlaybook] = useState(false);
  const [playbookResult, setPlaybookResult] = useState(null);

  const fetchPlaybooks = async () => {
    setLoadingPlaybooks(true);
    try {
      const res = await incidentsApi.getPlaybooks();
      if (res?.playbooks && res.playbooks.length > 0) {
        setPlaybooks(res.playbooks);
        if (!selectedPlaybookName || !res.playbooks.some(p => p.name === selectedPlaybookName)) {
          setSelectedPlaybookName(res.playbooks[0].name);
        }
      }
    } catch (err) {
      console.warn('Using built-in SOAR playbooks catalog:', err);
    } finally {
      setLoadingPlaybooks(false);
    }
  };

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  useEffect(() => {
    if (showPlaybookModal) {
      fetchPlaybooks();
    }
  }, [showPlaybookModal]);

  if (!incident) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center h-[760px] transition-colors duration-200">
        <ShieldAlert className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">No Incident Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select an incident from the queue to start AI investigation.</p>
      </div>
    );
  }

  const entities = incident.entities || [];
  const targetUser = entities.find(e => e.kind === 'Account')?.upn || entities.find(e => e.kind === 'Account')?.name || incident.assignedTo || 'No Account Entity';
  const targetIp = entities.find(e => e.kind === 'Ip')?.address || 'No IP Entity';
  const targetHost = entities.find(e => e.kind === 'Host')?.name || 'No Host Entity';

  const handlePostComment = async (e) => {
    e?.preventDefault();
    if (!commentText.trim()) return;
    setIsPostingComment(true);
    try {
      await incidentsApi.addComment(incident.id, commentText);
      setCommentText('');
      if (onUpdateIncident) onUpdateIncident();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Closed') {
      setShowCloseModal(true);
      return;
    }

    setStatusUpdating(true);
    const prevStatus = incident.status;
    incident.status = newStatus; // Optimistic UI update
    incident.classification = null;
    incident.classificationReason = null;
    try {
      await incidentsApi.updateStatus(incident.id, { status: newStatus });
      setAssignNotification({
        type: 'success',
        text: `Incident status updated to "${newStatus}" in Microsoft Sentinel.`
      });
      setTimeout(() => setAssignNotification(null), 4000);
      if (onUpdateIncident) onUpdateIncident();
    } catch (err) {
      console.error(err);
      incident.status = prevStatus; // Rollback
      setAssignNotification({
        type: 'error',
        text: 'Failed to update status in Microsoft Sentinel.'
      });
      setTimeout(() => setAssignNotification(null), 4000);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmClose = async (e) => {
    e?.preventDefault();
    setStatusUpdating(true);
    const prevStatus = incident.status;
    const prevCls = incident.classification;
    const prevReason = incident.classificationReason;

    // Optimistic UI update
    incident.status = 'Closed';
    incident.classification = closeClassification;
    incident.classificationReason = closeClassification === 'Undetermined' ? null : closeReason;
    incident.classificationComment = closeComment;

    try {
      await incidentsApi.updateStatus(incident.id, {
        status: 'Closed',
        classification: closeClassification,
        classification_reason: closeClassification === 'Undetermined' ? null : closeReason,
        classification_comment: closeComment
      });

      setShowCloseModal(false);
      setAssignNotification({
        type: 'success',
        text: `Incident closed as "${closeClassification}" (${closeReason || 'Undetermined'}) in Sentinel.`
      });
      setTimeout(() => setAssignNotification(null), 4500);
      if (onUpdateIncident) onUpdateIncident();
    } catch (err) {
      console.error(err);
      incident.status = prevStatus;
      incident.classification = prevCls;
      incident.classificationReason = prevReason;
      setAssignNotification({
        type: 'error',
        text: 'Failed to close incident with classification in Sentinel.'
      });
      setTimeout(() => setAssignNotification(null), 4000);
    } finally {
      setStatusUpdating(false);
    }
  };

  const triggerRemediation = async () => {
    if (!remediationModal) return;
    setIsRemediating(true);
    try {
      const res = await incidentsApi.executeRemediation(
        incident.id,
        remediationModal.type,
        remediationModal.entity,
        remediationModal.parameters || {}
      );
      setRemediationResult(res);
      if (onUpdateIncident) onUpdateIncident();
    } catch (err) {
      setRemediationResult({
        status: 'ERROR',
        result_message: err.response?.data?.detail || err.message
      });
    } finally {
      setIsRemediating(false);
    }
  };

  const getPlaybookCategoryColor = (category) => {
    switch ((category || '').toLowerCase()) {
      case 'containment':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'identity':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'network':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'notification':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'ticketing':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'forensics':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const handleTriggerPlaybook = async (e) => {
    e?.preventDefault();
    if (!selectedPlaybookName) return;
    setIsTriggeringPlaybook(true);
    setPlaybookResult(null);

    const chosen = playbooks.find(p => p.name === selectedPlaybookName) || { name: selectedPlaybookName };

    try {
      const res = await incidentsApi.executeRemediation(
        incident.id,
        'trigger_playbook',
        `Incident #${incident.incidentNumber}`,
        {
          playbook_name: chosen.name,
          notes: playbookNotes.trim() || `Automated SOAR response execution for Incident #${incident.incidentNumber}`
        }
      );
      setPlaybookResult(res);
      setAssignNotification({
        type: 'success',
        text: `Playbook "${chosen.name}" successfully triggered. Audit logged to Sentinel.`
      });
      setTimeout(() => setAssignNotification(null), 5000);
      if (onUpdateIncident) onUpdateIncident();
    } catch (err) {
      setPlaybookResult({
        status: 'ERROR',
        result_message: err.response?.data?.detail || err.message || 'Failed to trigger Azure Logic App playbook.'
      });
    } finally {
      setIsTriggeringPlaybook(false);
    }
  };

  const handleAssignUser = async (targetUserUpn) => {
    setIsAssigning(true);
    try {
      if (!targetUserUpn || targetUserUpn === 'unassigned') {
        await incidentsApi.assignIncident(incident.id, {});
        setAssignNotification({ type: 'success', text: 'Incident unassigned in Microsoft Sentinel.' });
      } else {
        const selected = entraUsers.find(u => (u.userPrincipalName || u.email) === targetUserUpn);
        const payload = {
          user_id: selected?.objectId,
          user_name: selected?.displayName || targetUserUpn.split('@')[0],
          user_email: selected?.email || targetUserUpn,
          user_upn: selected?.userPrincipalName || targetUserUpn
        };
        await incidentsApi.assignIncident(incident.id, payload);
        setAssignNotification({
          type: 'success',
          text: `Assigned to ${selected?.displayName || targetUserUpn} in Sentinel.`
        });
      }
      setTimeout(() => setAssignNotification(null), 4000);
      if (onUpdateIncident) onUpdateIncident();
    } catch (err) {
      console.error('Assignment error:', err);
      setAssignNotification({ type: 'error', text: 'Failed to update assignment in Sentinel.' });
      setTimeout(() => setAssignNotification(null), 4000);
    } finally {
      setIsAssigning(false);
    }
  };

  const currentAssigneeUpn = incident.assignedTo || '';
  const currentAssigneeObj = entraUsers.find(u => 
    (u.userPrincipalName && u.userPrincipalName.toLowerCase() === currentAssigneeUpn.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase() === currentAssigneeUpn.toLowerCase()) ||
    (u.email && u.email.toLowerCase() === currentAssigneeUpn.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[760px] transition-colors duration-200 relative">
      {/* Assignment Success / Alert Toast */}
      {assignNotification && (
        <div className={`absolute top-3 right-5 z-50 flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xl border animate-bounce ${
          assignNotification.type === 'success'
            ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40 shadow-emerald-950/50'
            : 'bg-red-950 text-red-200 border-red-500/40 shadow-red-950/50'
        }`}>
          {assignNotification.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          <span>{assignNotification.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-1.5">
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                INCIDENT #{incident.incidentNumber}
              </span>
              <span className="flex items-center space-x-1 text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                <span>Created: {formatDateTime(incident.createdTimeUtc, tz, 'medium')}</span>
              </span>
              {incident.lastModifiedTimeUtc && incident.lastModifiedTimeUtc !== incident.createdTimeUtc && (
                <span className="flex items-center space-x-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Updated: {formatRelativeTime(incident.lastModifiedTimeUtc)}</span>
                </span>
              )}
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{incident.title}</h1>
          </div>

          {/* Run AI Triage Primary Action */}
          <button
            onClick={() => onRunTriage(incident)}
            disabled={isTriaging}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-all ${
              isTriaging
                ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed animate-pulse'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
            }`}
          >
            <Play className={`w-4 h-4 ${isTriaging ? 'animate-spin' : 'fill-current'}`} />
            <span>{isTriaging ? 'AI Investigating...' : 'Run Autonomous Triage'}</span>
          </button>
        </div>

        {/* Quick Status / Severity / Entra ID Assignee Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center space-x-4 flex-wrap gap-y-2">
            {/* Status Select */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-600 dark:text-slate-400">Status:</span>
              <select
                value={incident.status}
                disabled={statusUpdating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded px-2 py-0.5 text-xs font-medium focus:border-blue-500"
              >
                <option value="New">New</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Severity Pill */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-600 dark:text-slate-400">Severity:</span>
              <span className="font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                {incident.severity}
              </span>
            </div>

            {/* Entra ID SOC Engineer Assignee Dropdown */}
            <div className="flex items-center space-x-1.5 bg-indigo-50/50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-500/30">
              <div className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                {incident.assignedTo ? <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <UserPlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                <span className="hidden sm:inline">Assignee (Entra ID):</span>
              </div>
              <select
                disabled={isAssigning || loadingUsers}
                value={currentAssigneeObj?.userPrincipalName || incident.assignedTo || 'unassigned'}
                onChange={(e) => handleAssignUser(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700/60 text-slate-900 dark:text-slate-100 rounded px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 max-w-[220px]"
              >
                <option value="unassigned">-- Unassigned --</option>
                {entraUsers.map((user, idx) => (
                  <option key={user.objectId || idx} value={user.userPrincipalName || user.email}>
                    {user.displayName} ({user.userPrincipalName || user.email})
                  </option>
                ))}
              </select>
              {isAssigning && <Clock className="w-3 h-3 text-indigo-500 animate-spin" />}
            </div>
            {/* Classification Badge & Mandatory Close Trigger */}
            <div className="flex items-center space-x-1.5">
              {incident.status === 'Closed' || incident.classification ? (
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all shadow-sm ${
                    incident.classification === 'TruePositive'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20'
                      : incident.classification === 'FalsePositive'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      : incident.classification === 'BenignPositive'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 hover:bg-slate-500/20'
                  }`}
                  title="Click to edit or review incident classification"
                >
                  <Tag className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {incident.classification === 'TruePositive' && '🎯 True Positive'}
                    {incident.classification === 'FalsePositive' && '🟢 False Positive'}
                    {incident.classification === 'BenignPositive' && '🛡️ Benign Positive'}
                    {incident.classification === 'Undetermined' && '⚪ Undetermined'}
                    {!incident.classification && 'Closed'}
                    {incident.classificationReason ? ` • ${incident.classificationReason}` : ''}
                  </span>
                  <FileEdit className="w-3 h-3 ml-1 opacity-70" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-500 text-[11px] font-semibold transition-all shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Close & Classify</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-wrap">
            {incident.labels?.map((label, idx) => (
              <span
                key={idx}
                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-300 dark:border-slate-700"
              >
                #{label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Active SOAR Remediation Action Bar */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-500/30 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                1-Click SOAR Remediation & Containment
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Active Response Ready
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Action 1: Isolate Endpoint */}
            <button
              onClick={() => {
                setRemediationResult(null);
                setRemediationModal({
                  type: 'isolate_endpoint',
                  title: 'Isolate Endpoint Device (MDE)',
                  entity: targetHost,
                  description: `Isolates host '${targetHost}' from corporate network via Microsoft Defender for Endpoint to prevent lateral movement.`
                });
              }}
              className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-red-500/50 flex flex-col items-start space-y-1 transition-all text-left group"
            >
              <div className="flex items-center space-x-1.5 text-red-400 font-semibold group-hover:text-red-300">
                <Radio className="w-3.5 h-3.5" />
                <span>Isolate Host</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate w-full">{targetHost}</span>
            </button>

            {/* Action 2: Revoke Sessions */}
            <button
              onClick={() => {
                setRemediationResult(null);
                setRemediationModal({
                  type: 'revoke_sessions',
                  title: 'Revoke Entra ID Sessions',
                  entity: targetUser,
                  description: `Invalidates all active refresh tokens and OAuth sessions for user '${targetUser}', enforcing MFA on next login.`
                });
              }}
              className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-amber-500/50 flex flex-col items-start space-y-1 transition-all text-left group"
            >
              <div className="flex items-center space-x-1.5 text-amber-400 font-semibold group-hover:text-amber-300">
                <Lock className="w-3.5 h-3.5" />
                <span>Revoke Sessions</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate w-full">{targetUser}</span>
            </button>

            {/* Action 3: Block Attacker IP */}
            <button
              onClick={() => {
                setRemediationResult(null);
                setRemediationModal({
                  type: 'block_ip',
                  title: 'Block Malicious IP at Firewall',
                  entity: targetIp,
                  description: `Applies perimeter firewall block rule and ingests '${targetIp}' into Sentinel Threat Intelligence feed.`
                });
              }}
              className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-blue-500/50 flex flex-col items-start space-y-1 transition-all text-left group"
            >
              <div className="flex items-center space-x-1.5 text-blue-400 font-semibold group-hover:text-blue-300">
                <Ban className="w-3.5 h-3.5" />
                <span>Block IP Feed</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate w-full">{targetIp}</span>
            </button>

            {/* Action 4: Trigger Playbook */}
            <button
              onClick={() => {
                setPlaybookResult(null);
                setShowPlaybookModal(true);
              }}
              className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-purple-500/50 flex flex-col items-start space-y-1 transition-all text-left group"
            >
              <div className="flex items-center space-x-1.5 text-purple-400 font-semibold group-hover:text-purple-300">
                <Workflow className="w-3.5 h-3.5" />
                <span>Run Playbook</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate w-full">Select Logic App</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Alert Description
          </h4>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">{incident.description}</p>
        </div>

        {/* Correlated Sentinel & Defender Alerts */}
        {(() => {
          const displayAlerts = (incident.alerts && incident.alerts.length > 0) ? incident.alerts : [
            {
              id: `al-${incident.incidentNumber || incident.id}`,
              title: incident.title,
              description: incident.description || 'Analytic detection rule triggered in Microsoft Sentinel workspace.',
              severity: incident.severity || 'Medium',
              vendor: 'Microsoft Sentinel (Analytics Rule)',
              product: 'Microsoft Sentinel',
              tactics: incident.tactics || [],
              techniques: incident.techniques || [],
              timeGenerated: incident.createdTimeUtc,
              alertLink: `https://portal.azure.com/#blade/Microsoft_Azure_Security_Insights/IncidentOverviewBlade/id/${incident.id}`
            }
          ];

          return (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span>Correlated Sentinel & Defender Alerts ({displayAlerts.length})</span>
                </h4>
              </div>
              <div className="space-y-2">
                {displayAlerts.map((al, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{al.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/20">
                            {al.vendor || al.product}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{al.timeGenerated ? formatDateTime(al.timeGenerated, tz, 'medium') : 'Recent'}</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          al.severity === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                          al.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {al.severity}
                        </span>
                        {al.alertLink && (
                          <a
                            href={al.alertLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Open Alert in Microsoft Defender / Sentinel Portal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {al.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{al.description}</p>
                    )}

                    {al.tactics && al.tactics.length > 0 && (
                      <div className="flex items-center space-x-1.5 pt-1">
                        {al.tactics.map((t, tidx) => (
                          <span key={tidx} className="text-[9px] font-mono bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">
                            {t}
                          </span>
                        ))}
                        {al.techniques && al.techniques.map((tech, tidx) => (
                          <span key={tidx} className="text-[9px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Extracted Entities */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Correlated Assets & Entities ({incident.entities?.length || 0})</span>
            </h4>
            {incident.entities?.length === 0 && (
              <span className="text-[10px] text-slate-500 italic">No entities associated</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {incident.entities?.map((ent, idx) => {
              let Icon = Server;
              let label = ent.name || ent.address || ent.processName || ent.url || 'Entity';
              let subtext = ent.kind;
              let badgeColor = 'bg-slate-200/80 dark:bg-slate-900 text-blue-600 dark:text-blue-400';

              if (ent.kind === 'Account') {
                Icon = User;
                label = ent.upn || ent.name || ent.accountName;
                subtext = ent.name && ent.upn && ent.name !== ent.upn ? `${ent.name} • Entra ID` : 'Entra ID User Account';
                badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
              } else if (ent.kind === 'Host') {
                Icon = Server;
                label = ent.name;
                subtext = ent.os ? `${ent.os} Device` : 'Endpoint Host / VM';
                badgeColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
              } else if (ent.kind === 'Ip') {
                Icon = Globe;
                label = ent.address;
                subtext = ent.location || (ent.isInternal ? 'Internal RFC1918' : 'External IP');
                badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
              } else if (ent.kind === 'Process') {
                Icon = Terminal;
                label = ent.processName;
                subtext = ent.commandLine ? `${ent.commandLine.slice(0, 50)}...` : 'Process Execution';
                badgeColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
              } else if (ent.kind === 'FileHash' || ent.kind === 'File') {
                Icon = FileCode;
                label = ent.name;
                subtext = ent.sha256 ? `SHA256: ${ent.sha256.slice(0, 16)}...` : 'File Asset';
                badgeColor = 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
              } else if (ent.kind === 'Url') {
                Icon = Link;
                label = ent.url || ent.name;
                subtext = 'URL Indicator';
                badgeColor = 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20';
              } else if (ent.kind === 'AzureResource') {
                Icon = Cloud;
                label = ent.name;
                subtext = 'Azure Cloud Resource';
                badgeColor = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
              } else if (ent.kind === 'Mailbox' || ent.kind === 'MailMessage') {
                Icon = Mail;
                label = ent.name;
                subtext = ent.subject ? `Subject: ${ent.subject.slice(0, 30)}...` : 'Mailbox Entity';
                badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
              }

              return (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2.5 flex items-start space-x-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className={`p-2 rounded ${badgeColor} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate" title={label}>{label}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate" title={subtext}>{subtext}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sentinel Activity / Comments Timeline */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sentinel Incident Notes & Audit Log</span>
          </h4>
          <div className="space-y-2 mb-3">
            {incident.comments && incident.comments.length > 0 ? (
              incident.comments.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{c.author}</span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {formatDateTime(c.createdTimeUtc, tz, 'medium')}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">{c.message}</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic bg-slate-100 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800/60">
                No comments or analyst notes yet.
              </div>
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handlePostComment} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Add investigation comment to Microsoft Sentinel..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isPostingComment || !commentText.trim()}
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 flex items-center space-x-1 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>Post</span>
            </button>
          </form>
        </div>
      </div>

      {/* Interactive Remediation Confirmation Modal */}
      {remediationModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{remediationModal.title}</h3>
                  <span className="text-[11px] font-mono text-slate-500">Target: {remediationModal.entity}</span>
                </div>
              </div>
              <button
                onClick={() => setRemediationModal(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {remediationModal.description}
            </p>

            {/* Execution Result Banner */}
            {remediationResult && (
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                remediationResult.status === 'SUCCESS'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center space-x-2 font-bold">
                  {remediationResult.status === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{remediationResult.status === 'SUCCESS' ? 'Remediation Executed Successfully' : 'Execution Failed'}</span>
                </div>
                <p className="text-[11px] leading-relaxed">{remediationResult.result_message}</p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRemediationModal(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                {remediationResult ? 'Close' : 'Cancel'}
              </button>

              {!remediationResult && (
                <button
                  type="button"
                  onClick={triggerRemediation}
                  disabled={isRemediating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
                >
                  <Zap className={`w-3.5 h-3.5 ${isRemediating ? 'animate-spin' : ''}`} />
                  <span>{isRemediating ? 'Executing...' : 'Confirm & Execute Action'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Mandatory Closure & Classification Modal */}
      {showCloseModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Close & Classify Incident</h3>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Incident #{incident.incidentNumber} • Synced directly to Microsoft Sentinel
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmClose} className="space-y-4 text-xs">
              {/* Classification Option Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Mandatory Classification:</span>
                  <span className="text-[10px] text-red-500 font-mono">* Required by Sentinel</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'TruePositive', label: 'True Positive', desc: 'Confirmed attack / malicious activity', border: 'border-red-500/40 text-red-500', bg: 'bg-red-500/10' },
                    { id: 'BenignPositive', label: 'Benign Positive', desc: 'Suspicious but expected / Authorized test', border: 'border-amber-500/40 text-amber-500', bg: 'bg-amber-500/10' },
                    { id: 'FalsePositive', label: 'False Positive', desc: 'Inaccurate telemetry or alert logic', border: 'border-emerald-500/40 text-emerald-500', bg: 'bg-emerald-500/10' },
                    { id: 'Undetermined', label: 'Undetermined', desc: 'Inconclusive / insufficient forensic data', border: 'border-slate-500/40 text-slate-400', bg: 'bg-slate-500/10' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCloseClassification(item.id);
                        if (item.id === 'TruePositive') setCloseReason('SuspiciousActivity');
                        else if (item.id === 'BenignPositive') setCloseReason('SuspiciousButExpected');
                        else if (item.id === 'FalsePositive') setCloseReason('InaccurateData');
                        else setCloseReason('');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        closeClassification === item.id
                          ? `${item.bg} ${item.border} ring-2 ring-blue-500/50 shadow-sm`
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{item.label}</span>
                        {closeClassification === item.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Classification Reason Selector (Dynamic) */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Classification Reason:</span>
                  {closeClassification === 'Undetermined' ? (
                    <span className="text-[10px] text-slate-500 font-mono">None required</span>
                  ) : (
                    <span className="text-[10px] text-red-500 font-mono">* Required</span>
                  )}
                </label>
                {closeClassification === 'Undetermined' ? (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] italic">
                    Reason not applicable for Undetermined incidents.
                  </div>
                ) : closeClassification === 'FalsePositive' ? (
                  <select
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg p-2 text-xs font-medium focus:border-blue-500"
                  >
                    <option value="InaccurateData">Inaccurate Data (Telemetry or log parsing anomaly)</option>
                    <option value="IncorrectAlertLogic">Incorrect Alert Logic (Rule threshold or detection formula false positive)</option>
                  </select>
                ) : closeClassification === 'BenignPositive' ? (
                  <select
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg p-2 text-xs font-medium focus:border-blue-500"
                  >
                    <option value="SuspiciousButExpected">Suspicious But Expected (Pen test, authorized admin activity, approved tool)</option>
                  </select>
                ) : (
                  <select
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg p-2 text-xs font-medium focus:border-blue-500"
                  >
                    <option value="SuspiciousActivity">Suspicious Activity (Confirmed threat indicator or attack sequence)</option>
                  </select>
                )}
              </div>

              {/* Closing Notes & Sentinel Comment Audit */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Resolution Notes / Audit Comment:</span>
                  <span className="text-[10px] text-slate-500">Auto-synced to Sentinel</span>
                </label>
                <textarea
                  value={closeComment}
                  onChange={(e) => setCloseComment(e.target.value)}
                  placeholder="e.g. Investigation completed. Confirmed authorized penetration testing activity from IT SecOps team..."
                  rows={3}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 text-xs focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
                >
                  {statusUpdating ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing to Sentinel...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Close Incident</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Azure Logic Apps / SOAR Playbook Selector Modal */}
      {showPlaybookModal && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] p-6 shadow-2xl flex flex-col space-y-4 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Select & Trigger Azure Logic App (SOAR Playbook)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Incident #{incident.incidentNumber} • {incident.title}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPlaybookModal(false);
                  setPlaybookResult(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Category Filter Header */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={playbookSearch}
                  onChange={(e) => setPlaybookSearch(e.target.value)}
                  placeholder="Search Logic Apps by name, action, category, or tag..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                {['All', 'Containment', 'Identity', 'Network', 'Notification', 'Ticketing', 'Forensics'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPlaybookCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                      playbookCategory === cat
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Playbooks Selection List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[300px]">
              {loadingPlaybooks ? (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <Clock className="w-5 h-5 animate-spin text-purple-400" />
                  <span>Loading Azure Logic Apps & Sentinel Playbooks...</span>
                </div>
              ) : playbooks.filter((p) => {
                const matchesCat = playbookCategory === 'All' || (p.category || '').toLowerCase() === playbookCategory.toLowerCase();
                const q = playbookSearch.toLowerCase().trim();
                const matchesSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.displayName || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
                return matchesCat && matchesSearch;
              }).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  No Logic App playbooks matched your filter.
                </div>
              ) : (
                playbooks
                  .filter((p) => {
                    const matchesCat = playbookCategory === 'All' || (p.category || '').toLowerCase() === playbookCategory.toLowerCase();
                    const q = playbookSearch.toLowerCase().trim();
                    const matchesSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.displayName || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
                    return matchesCat && matchesSearch;
                  })
                  .map((pb) => {
                    const isSelected = selectedPlaybookName === pb.name;
                    return (
                      <div
                        key={pb.id || pb.name}
                        onClick={() => setSelectedPlaybookName(pb.name)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-3 ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500 text-slate-900 dark:text-white ring-2 ring-purple-500/40 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="radio"
                            name="selectedPlaybook"
                            checked={isSelected}
                            onChange={() => setSelectedPlaybookName(pb.name)}
                            className="text-purple-600 focus:ring-purple-500 h-4 w-4"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5 truncate">
                              <span className="truncate">{pb.displayName || pb.name}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getPlaybookCategoryColor(pb.category)}`}>
                                {pb.category || 'SOAR'}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                ● {pb.state || 'Enabled'}
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] font-mono text-purple-700 dark:text-purple-300 mt-0.5">
                            <code>{pb.name}</code>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {pb.description}
                          </p>

                          <div className="mt-1.5 flex items-center space-x-3 text-[10px] text-slate-400 font-mono">
                            <span>Trigger: {pb.triggerType || 'Incident Trigger'}</span>
                            <span>•</span>
                            <span>RG: {pb.resourceGroup || 'sentinel-demo'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Target Entities & Execution Notes */}
            <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Contextual Target Entities:</span>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                  <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">Account: {targetUser}</span>
                  <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">IP: {targetIp}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Execution Notes / Tracking Reason (Recorded in Sentinel Comment Audit):
                </label>
                <input
                  type="text"
                  value={playbookNotes}
                  onChange={(e) => setPlaybookNotes(e.target.value)}
                  placeholder={`e.g. Triggering ${selectedPlaybookName} following AI forensic triage...`}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Execution Result Banner */}
            {playbookResult && (
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                playbookResult.status === 'SUCCESS'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center space-x-2 font-bold">
                  {playbookResult.status === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <span>{playbookResult.status === 'SUCCESS' ? 'Azure Logic App Playbook Triggered' : 'Trigger Failed'}</span>
                </div>
                <p className="text-[11px] leading-relaxed">{playbookResult.result_message || playbookResult.message}</p>
                {playbookResult.run_id && (
                  <div className="text-[10px] font-mono text-slate-400 pt-0.5">
                    Execution Run ID: <code className="text-purple-400">{playbookResult.run_id}</code> • Synced to Microsoft Sentinel
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-500">
                Selected: <strong className="text-purple-600 dark:text-purple-400 font-mono">{selectedPlaybookName}</strong>
              </div>
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowPlaybookModal(false);
                    setPlaybookResult(null);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  {playbookResult ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleTriggerPlaybook}
                  disabled={isTriggeringPlaybook || !selectedPlaybookName}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all flex items-center space-x-1.5"
                >
                  <Zap className={`w-3.5 h-3.5 ${isTriggeringPlaybook ? 'animate-spin' : ''}`} />
                  <span>{isTriggeringPlaybook ? 'Triggering Logic App...' : 'Trigger Selected Playbook'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
