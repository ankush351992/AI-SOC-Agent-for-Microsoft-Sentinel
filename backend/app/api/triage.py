from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, HTMLResponse
from typing import List, Dict, Any, Optional
import json
from datetime import datetime
from pydantic import BaseModel
from app.auth.jwt_handler import get_current_user, User
from app.services.sentinel_client import sentinel_client
from app.agent.triage_agent import triage_agent
from app.services.report_generator import generate_docx_report, generate_html_report

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
    format: str = Query("docx", enum=["docx", "markdown", "json", "html"]),
    current_user: User = Depends(get_current_user)
):
    """Download executive incident investigation report as Word (.docx), Markdown, JSON, or printable HTML/PDF report"""
    incident = await sentinel_client.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    report = TRIAGE_REPORTS_CACHE.get(incident_id)
    if not report:
        report = await triage_agent.triage_incident(incident)
        TRIAGE_REPORTS_CACHE[incident_id] = report

    inc_num = incident.get("incidentNumber", "Report")
    analyst_name = f"{current_user.username} ({current_user.role})"

    if format == "docx":
        file_stream = generate_docx_report(incident=incident, report=report, analyst_name=analyst_name)
        return Response(
            content=file_stream.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="Sentinel-Executive-Brief-Incident-{inc_num}.docx"'
            }
        )

    if format == "html":
        html_doc = generate_html_report(incident=incident, report=report, analyst_name=analyst_name)
        return HTMLResponse(content=html_doc)

    if format == "json":
        json_content = json.dumps(
            {
                "incident": incident,
                "triage_report": report,
                "exported_by": analyst_name,
                "exported_at": datetime.utcnow().isoformat() + "Z"
            },
            indent=2
        )
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="Sentinel-Triage-Incident-{inc_num}.json"'}
        )

    # Markdown format default with full RCA
    rca = report.get("root_cause_analysis", {})
    patient_zero = rca.get("patient_zero", "Directory Actor / Cloud Identity")
    attack_vector = rca.get("initial_access_vector", incident.get("description", "Sentinel analytic detection rule trigger."))
    tactics = ", ".join(report.get("mitre_attack", {}).get("tactics", [])) or "None"
    techniques = ", ".join(report.get("mitre_attack", {}).get("techniques", [])) or "None"
    evidence = "\n".join([f"- {e}" for e in report.get("evidence_findings", [])]) or "- No specific evidence logged"
    capa_actions = "\n".join([f"- [ ] {a}" for a in (rca.get("corrective_and_preventive_actions") or report.get("recommended_actions", []))]) or "- [ ] None recorded"
    c2_telemetry = rca.get("network_c2_telemetry", {})
    blast_radius = rca.get("blast_radius", {})

    model_used = report.get("model_used", "gpt-4o-mini")
    reasoning_tier = str(report.get("reasoning_tier", "fast")).replace("_", " ").title()

    md_content = f"""# 🛡️ Microsoft Sentinel SOC Root Cause Analysis (RCA) Report
**Incident:** #{inc_num} - {incident.get("title")}
**Generated On:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
**Reviewing Analyst:** {analyst_name}
**AI Verdict:** {report.get("verdict")} ({report.get("confidence_score")}% Confidence)
**Assessed Severity:** {report.get("severity_assessment", incident.get("severity"))}
**AI Model Used:** {model_used} ({reasoning_tier})

---

## 📋 1. Executive Summary & Root Cause (Model: {model_used})
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
