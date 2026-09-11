from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, HTMLResponse
from typing import List, Dict, Any, Optional
import json
from datetime import datetime
from pydantic import BaseModel
from app.auth.jwt_handler import get_current_user, User
from app.services.sentinel_client import sentinel_client
from app.agent.triage_agent import triage_agent

router = APIRouter(prefix="/triage", tags=["AI Triage"])

# Store generated triage reports in memory
TRIAGE_REPORTS_CACHE: Dict[str, Dict[str, Any]] = {}

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[Dict[str, str]]] = []

class KQLRunRequest(BaseModel):
    query: str
    timespan_hours: Optional[int] = 24

@router.post("/kql/run")
async def execute_kql_query(
    req: KQLRunRequest,
    current_user: User = Depends(get_current_user)
):
    """Execute arbitrary KQL query directly against Log Analytics workspace"""
    from app.services.kql_runner import kql_runner
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    result = await kql_runner.execute_kql(req.query, timespan_hours=req.timespan_hours or 24)
    return result

@router.post("/{incident_id}/run")
async def run_triage(incident_id: str, current_user: User = Depends(get_current_user)):
    """Run full automated AI triage on a Sentinel incident"""
    incident = await sentinel_client.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    
    report = await triage_agent.triage_incident(incident)
    TRIAGE_REPORTS_CACHE[incident_id] = report
    return report

@router.get("/{incident_id}/report")
async def get_triage_report(incident_id: str, current_user: User = Depends(get_current_user)):
    """Retrieve existing triage report for incident if already generated"""
    if incident_id in TRIAGE_REPORTS_CACHE:
        return TRIAGE_REPORTS_CACHE[incident_id]
    
    # Check if incident exists
    incident = await sentinel_client.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Return empty state or run on demand
    return {"status": "NOT_TRIAGED", "message": "Incident has not been triaged yet. Click 'Run AI Triage'."}

@router.put("/{incident_id}/report")
async def update_triage_report(
    incident_id: str,
    updated_report: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Allow SOC Analyst to directly edit and save the triage report from the portal"""
    incident = await sentinel_client.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    updated_report["last_edited_by"] = f"{current_user.username} ({current_user.role})"
    updated_report["last_edited_at"] = datetime.utcnow().isoformat() + "Z"
    TRIAGE_REPORTS_CACHE[incident_id] = updated_report
    return {"status": "SUCCESS", "report": updated_report}

@router.get("/{incident_id}/download")
async def download_triage_report(
    incident_id: str,
    format: str = Query("markdown", enum=["markdown", "json", "html"]),
    current_user: User = Depends(get_current_user)
):
    """Download triage investigation report as Markdown, JSON, or printable HTML/PDF report"""
    incident = await sentinel_client.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    report = TRIAGE_REPORTS_CACHE.get(incident_id)
    if not report:
        report = await triage_agent.triage_incident(incident)
        TRIAGE_REPORTS_CACHE[incident_id] = report

    inc_num = incident.get("incidentNumber", "Report")
    
    if format == "json":
        json_content = json.dumps(
            {
                "incident": incident,
                "triage_report": report,
                "exported_at": datetime.utcnow().isoformat() + "Z"
            },
            indent=2
        )
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="Sentinel-Triage-Incident-{inc_num}.json"'}
        )

    rca = report.get("root_cause_analysis", {})
    patient_zero = rca.get("patient_zero", "Directory Actor / Cloud Identity")
    attack_vector = rca.get("initial_access_vector", incident.get("description", "Sentinel analytic detection rule trigger."))
    tactics = ", ".join(report.get("mitre_attack", {}).get("tactics", [])) or "None"
    techniques = ", ".join(report.get("mitre_attack", {}).get("techniques", [])) or "None"
    evidence = "\n".join([f"- {e}" for e in report.get("evidence_findings", [])]) or "- No specific evidence logged"
    
    process_tree_text = ""
    for p in rca.get("process_tree", []):
        process_tree_text += f"\n- **PID {p.get('pid')}:** `{p.get('process')}`\n  `{p.get('command')}`"
        if p.get("decoded"):
            process_tree_text += f"\n  - *Decoded Payload:* `{p.get('decoded')}`"

    process_tree_html = ""
    for p in rca.get("process_tree", []):
        decoded_block = f"<div style='margin-top:4px; padding:6px; background:#0B0F19; color:#67E8F9; border-radius:4px;'><strong>Decoded Payload:</strong> <code>{p.get('decoded')}</code></div>" if p.get('decoded') else ""
        process_tree_html += f"""<div style='background:#F1F5F9; border:1px solid #CBD5E1; padding:8px 12px; border-radius:6px; margin-bottom:8px; font-family:monospace; font-size:11px;'>
          <div><strong>PID {p.get('pid')}:</strong> <code style='color:#2563EB;'>{p.get('process')}</code></div>
          <div style='color:#64748B; word-break:break-all; margin-top:2px;'>Command: {p.get('command')}</div>
          {decoded_block}
        </div>"""

    c2_telemetry = rca.get("network_c2_telemetry", {})
    blast_radius = rca.get("blast_radius", {})
    capa_actions = "\n".join([f"- [ ] {a}" for a in rca.get("corrective_and_preventive_actions", [])]) or "\n".join([f"- [ ] {a}" for a in report.get("recommended_actions", [])])

    if format == "html":
        verdict = report.get("verdict", "UNKNOWN")
        v_color = "#DC2626" if verdict == "TRUE_POSITIVE" else "#059669" if verdict == "FALSE_POSITIVE" else "#D97706"
        html_doc = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sentinel_RCA_Incident_{inc_num}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    body {{ font-family: 'Inter', system-ui, sans-serif; padding: 24px; color: #0F172A; max-width: 860px; margin: auto; font-size: 12px; line-height: 1.5; }}
    .header {{ border-bottom: 2px solid #0F172A; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }}
    .meta-box {{ background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }}
    .meta-label {{ font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; }}
    .meta-val {{ font-size: 12px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }}
    .verdict {{ border: 2px solid {v_color}; background: #F8FAFC; padding: 12px 16px; border-radius: 8px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; }}
    .sec-title {{ font-size: 12px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px; color: #0F172A; }}
    .box {{ background: #F8FAFC; border-left: 3px solid #3B82F6; padding: 10px 14px; border-radius: 0 6px 6px 0; }}
    pre {{ background: #0B0F19; color: #67E8F9; padding: 10px; border-radius: 6px; font-size: 11px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; }}
  </style>
</head>
<body onload="window.print()">
  <div class="header">
    <div>
      <h2 style="margin: 0 0 4px 0;">🛡️ Microsoft Sentinel SOC Root Cause Analysis (RCA)</h2>
      <p style="margin: 0; color: #64748B;">Incident #{inc_num}: {incident.get("title")}</p>
    </div>
    <div style="font-size: 10px; font-weight: 700; color: #DC2626;">RESTRICTED // SOC RCA</div>
  </div>

  <div class="meta-box">
    <div><div class="meta-label">Incident Number</div><div class="meta-val">#{inc_num}</div></div>
    <div><div class="meta-label">Assessed Severity</div><div class="meta-val" style="color: {v_color};">{report.get("severity_assessment", incident.get("severity"))}</div></div>
    <div><div class="meta-label">Patient Zero</div><div class="meta-val">{patient_zero}</div></div>
    <div><div class="meta-label">Confidence</div><div class="meta-val">{report.get("confidence_score")}%</div></div>
  </div>

  <div class="verdict">
    <div><div style="font-size: 9px; font-weight: 700; color: #64748B;">FORENSIC VERDICT</div><strong style="color: {v_color}; font-size: 16px;">{verdict}</strong></div>
    <div style="font-size: 20px; font-weight: 800; font-family: monospace;">{report.get("confidence_score")}%</div>
  </div>

  <div class="sec-title">1. Executive Summary & Root Cause Assessment</div>
  <div class="box">{report.get("executive_summary")}</div>

  <div class="sec-title">2. Patient Zero & Initial Attack Vector</div>
  <p><strong>Vector:</strong> {attack_vector}</p>

  {f'<div class="sec-title">3. Low-Level Process Execution Lineage & Subprocess Tree</div>{process_tree_html}' if process_tree_html else ''}

  {f'''<div class="sec-title">4. Network / Origin Telemetry</div>
  <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px 12px; border-radius:6px; font-family:monospace; font-size:11px;">
    <div><strong>Origin / Dest IP:</strong> {c2_telemetry.get("destination_ip", "No External IP")} ({c2_telemetry.get("protocol", "HTTPS")})</div>
    <div><strong>Reputation / Category:</strong> {c2_telemetry.get("reputation", "Cloud Control Plane / Audit Record")}</div>
    <div><strong>Telemetry:</strong> {c2_telemetry.get("bytes_transferred", "Audit Event")}</div>
  </div>''' if c2_telemetry.get("destination_ip") and c2_telemetry.get("destination_ip") != "No External C2 Observed" else ''}

  <div class="sec-title">5. MITRE ATT&CK Alignment</div>
  <p><strong>Tactics:</strong> {tactics}</p>
  <p><strong>Techniques:</strong> {techniques}</p>

  <div class="sec-title">6. Key Forensic Telemetry Findings</div>
  <pre style="background:#F8FAFC; color:#0F172A; border:1px solid #E2E8F0;">{evidence}</pre>

  <div class="sec-title">7. Corrective & Preventive Action Plan (CAPA)</div>
  <pre style="background:#F8FAFC; color:#0F172A; border:1px solid #E2E8F0;">{capa_actions}</pre>
</body>
</html>"""
        return HTMLResponse(content=html_doc)

    # Markdown format default with full RCA
    md_content = f"""# 🛡️ Microsoft Sentinel SOC Root Cause Analysis (RCA) Report
**Incident:** #{inc_num} - {incident.get("title")}
**Generated On:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
**AI Verdict:** {report.get("verdict")} ({report.get("confidence_score")}% Confidence)
**Assessed Severity:** {report.get("severity_assessment", incident.get("severity"))}

---

## 📋 1. Executive Summary & Root Cause
{report.get("executive_summary")}

---

## 🎯 2. Patient Zero & Initial Attack Vector
- **Patient Zero:** {patient_zero}
- **Initial Vector:** {attack_vector}

---

## 🌐 3. Origin & Correlated Telemetry
- **Target Identities:** {', '.join(blast_radius.get('compromised_identities', [])) or patient_zero}
- **Target Resources:** {', '.join(blast_radius.get('targeted_assets', [])) or incident.get('title')}
- **Network / Origin IP:** {c2_telemetry.get('destination_ip', 'No External IP')} ({c2_telemetry.get('reputation', 'Cloud Audit Log')})

---

## 🎯 4. MITRE ATT&CK Alignment
- **Tactics:** {tactics}
- **Techniques:** {techniques}

---

## 🔍 5. Key Forensic Evidence Findings
{evidence}

---

## ✅ 6. Corrective & Preventive Action Plan (CAPA)
{capa_actions}

---
*Report generated autonomously by Microsoft Sentinel AI SOC Agent v1.0*
"""
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="Sentinel-RCA-Incident-{inc_num}.md"'}
    )

@router.post("/{incident_id}/chat")
async def chat_with_incident_copilot(
    incident_id: str,
    req: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Interact with the SOC AI Copilot for this specific incident"""
    incident = await sentinel_client.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    response_text = await triage_agent.chat_with_incident(
        incident=incident,
        user_message=req.message,
        chat_history=req.chat_history or []
    )
    return {"response": response_text}
