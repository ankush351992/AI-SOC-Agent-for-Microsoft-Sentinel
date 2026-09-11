import React, { useState, useEffect } from 'react';
import StatsOverview from '../components/StatsOverview';
import IncidentList from '../components/IncidentList';
import IncidentDetail from '../components/IncidentDetail';
import LiveInvestigationStream from '../components/LiveInvestigationStream';
import TriageReportView from '../components/TriageReportView';
import KQLGenerator from '../components/KQLGenerator';
import { incidentsApi, triageApi } from '../services/api';
import { Eye, Terminal, FileText, Code2 } from 'lucide-react';

export default function DashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDays, setFilterDays] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Right-side Workbench Sub-Tab
  const [workbenchTab, setWorkbenchTab] = useState('detail'); // 'detail', 'trace', 'report', 'kql'

  // Live Triage & Telemetry State
  const [isTriaging, setIsTriaging] = useState(false);
  const [streamEvents, setStreamEvents] = useState([]);
  const [triageReport, setTriageReport] = useState(null);

  const fetchIncidentsAndStats = async () => {
    try {
      const [incData, statsData] = await Promise.all([
        incidentsApi.getIncidents(filterStatus, filterSeverity, filterDays),
        incidentsApi.getStats(filterDays)
      ]);
      setIncidents(incData);
      setStats(statsData);
      if (!selectedIncident && incData.length > 0) {
        setSelectedIncident(incData[0]);
        // Also fetch full metadata
        incidentsApi.getIncident(incData[0].id).then(full => {
          if (full) setSelectedIncident(full);
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Error fetching incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentsAndStats();
  }, [filterSeverity, filterStatus, filterDays]);

  const handleQuickFilter = ({ severity, status }) => {
    if (severity !== undefined) setFilterSeverity(severity);
    if (status !== undefined) setFilterStatus(status);
  };

  // Check if existing report exists when incident selected
  useEffect(() => {
    if (selectedIncident) {
      triageApi.getReport(selectedIncident.id).then((res) => {
        if (res && res.verdict) {
          setTriageReport(res);
        } else {
          setTriageReport(null);
        }
      }).catch(() => setTriageReport(null));
    }
  }, [selectedIncident?.id]);

  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
    setWorkbenchTab('detail');
    setStreamEvents([]);

    // Fetch full incident details (entities, comments, correlated alerts)
    incidentsApi.getIncident(inc.id).then((fullInc) => {
      if (fullInc) {
        setSelectedIncident(fullInc);
      }
    }).catch((err) => {
      console.debug("Note fetching detailed incident:", err);
    });
  };

  const handleRunTriage = (incident) => {
    setIsTriaging(true);
    setWorkbenchTab('trace');
    setStreamEvents([]);

    // Open WebSocket for live telemetry streaming
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/triage/${incident.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'INVESTIGATION_COMPLETE') {
          setIsTriaging(false);
          setTriageReport(data.report);
          setWorkbenchTab('report');
          fetchIncidentsAndStats();
          ws.close();
        } else {
          setStreamEvents((prev) => [...prev, data]);
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      // Fallback to REST API if WebSocket fails
      triageApi.runTriage(incident.id).then((rep) => {
        setTriageReport(rep);
        setIsTriaging(false);
        setWorkbenchTab('report');
        fetchIncidentsAndStats();
      }).catch(() => setIsTriaging(false));
    };

    ws.onclose = () => {
      setIsTriaging(false);
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Metrics Banner with Lookback Timeline Controls */}
      <StatsOverview
        stats={stats}
        lookbackDays={filterDays}
        onSelectLookback={setFilterDays}
        onQuickFilter={handleQuickFilter}
        filterSeverity={filterSeverity}
        filterStatus={filterStatus}
        onRefresh={fetchIncidentsAndStats}
        loading={loading}
      />

      {/* Main Dual-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Incidents Queue (4 cols) */}
        <div className="lg:col-span-4">
          <IncidentList
            incidents={incidents}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
            filterSeverity={filterSeverity}
            setFilterSeverity={setFilterSeverity}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterDays={filterDays}
            setFilterDays={setFilterDays}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            loading={loading}
          />
        </div>

        {/* Right Column: Workbench Tabs (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Workbench Tabs Header */}
          <div className="flex items-center justify-between bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-md transition-colors duration-200">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setWorkbenchTab('detail')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  workbenchTab === 'detail'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Incident Overview</span>
              </button>

              <button
                onClick={() => setWorkbenchTab('trace')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  workbenchTab === 'trace'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Agent Execution Trace</span>
                {isTriaging && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                )}
              </button>

              <button
                onClick={() => setWorkbenchTab('report')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  workbenchTab === 'report'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>AI Triage Report</span>
                {triageReport && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.2 rounded">
                    Ready
                  </span>
                )}
              </button>

              <button
                onClick={() => setWorkbenchTab('kql')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  workbenchTab === 'kql'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>KQL Generator</span>
              </button>
            </div>
          </div>

          {/* Workbench Tab Views */}
          {workbenchTab === 'detail' && (
            <IncidentDetail
              incident={selectedIncident}
              onRunTriage={handleRunTriage}
              isTriaging={isTriaging}
              onUpdateIncident={fetchIncidentsAndStats}
            />
          )}

          {workbenchTab === 'trace' && (
            <LiveInvestigationStream
              events={streamEvents}
              isRunning={isTriaging}
            />
          )}

          {workbenchTab === 'report' && (
            <TriageReportView
              report={triageReport}
              incident={selectedIncident}
              onRefresh={fetchIncidentsAndStats}
            />
          )}

          {workbenchTab === 'kql' && (
            <KQLGenerator incident={selectedIncident} />
          )}
        </div>
      </div>
    </div>
  );
}
