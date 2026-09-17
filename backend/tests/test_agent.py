import pytest
from app.config import settings
from app.agent.triage_agent import triage_agent
from app.services.sentinel_client import sentinel_client

@pytest.mark.asyncio
async def test_agent_triage_flow():
    incidents = await sentinel_client.list_incidents()
    target_inc = incidents[0]
    
    events_captured = []
    def progress_callback(event):
        events_captured.append(event)
    
    report = await triage_agent.triage_incident(target_inc, progress_callback=progress_callback)
    
    assert report is not None
    assert "verdict" in report
    assert "confidence_score" in report
    assert "mitre_attack" in report
    assert "model_used" in report
    assert "reasoning_tier" in report
    assert len(events_captured) > 0
    assert any(e["event"] == "INVESTIGATION_STARTED" for e in events_captured)
    assert any(e["event"] == "MODEL_SELECTED" for e in events_captured)
    assert any(e["event"] == "VERDICT_GENERATED" for e in events_captured)

def test_hybrid_model_selection():
    settings.LLM_ROUTING_MODE = "hybrid"

    # High severity -> gpt-6-astra (deep reasoning)
    high_inc = {"id": "inc-1", "severity": "High", "title": "Suspicious Activity", "tactics": ["Execution"]}
    res = triage_agent.select_triage_model(high_inc)
    assert res["model_name"] == "gpt-6-astra"
    assert res["reasoning_tier"] == "deep_reasoning"

    # Low severity routine -> gpt-4o-mini (fast)
    low_inc = {"id": "inc-2", "severity": "Low", "title": "Routine Signin Anomaly", "tactics": ["InitialAccess"]}
    res = triage_agent.select_triage_model(low_inc)
    assert res["model_name"] == "gpt-4o-mini"
    assert res["reasoning_tier"] == "fast"

    # Incident #5153 specific verification
    inc_5153 = {
        "id": "53807bc4-c879-4b6e-8d8d-59b257d61fa4",
        "incidentNumber": 5153,
        "title": "Rare and potentially high-risk Office operations involving one user",
        "description": "Identifies Office operations that are typically rare and can provide capabilities useful to attackers.",
        "severity": "Low",
        "tactics": [],
        "alertsCount": 1
    }
    res_5153 = triage_agent.select_triage_model(inc_5153)
    assert res_5153["model_name"] == "gpt-4o-mini"
    assert res_5153["reasoning_tier"] == "fast"
    assert "Low Severity" in res_5153["reason"]

    # Complex attack keyword in Medium severity -> gpt-6-astra (deep reasoning)
    complex_inc = {"id": "inc-3", "severity": "Medium", "title": "Encoded PowerShell and Ransomware Payload Detected", "tactics": ["Execution"]}
    res = triage_agent.select_triage_model(complex_inc)
    assert res["model_name"] == "gpt-6-astra"
    assert res["reasoning_tier"] == "deep_reasoning"

    # Multi-stage tactics (tactics >= 2) -> gpt-6-astra
    multistage_inc = {"id": "inc-4", "severity": "Medium", "title": "Generic Alert", "tactics": ["InitialAccess", "Persistence", "PrivilegeEscalation"]}
    res = triage_agent.select_triage_model(multistage_inc)
    assert res["model_name"] == "gpt-6-astra"
    assert res["reasoning_tier"] == "deep_reasoning"

def test_override_routing_modes():
    # Always Mini override
    settings.LLM_ROUTING_MODE = "always_mini"
    high_inc = {"id": "inc-1", "severity": "High", "title": "Ransomware Multi-Stage", "tactics": ["Execution", "Exfiltration"]}
    res = triage_agent.select_triage_model(high_inc)
    assert res["model_name"] == "gpt-4o-mini"
    assert res["reasoning_tier"] == "fast"

    # Always Astra override
    settings.LLM_ROUTING_MODE = "always_astra"
    low_inc = {"id": "inc-2", "severity": "Low", "title": "Minor Anomaly", "tactics": []}
    res = triage_agent.select_triage_model(low_inc)
    assert res["model_name"] == "gpt-6-astra"
    assert res["reasoning_tier"] == "deep_reasoning"

    # Reset back to hybrid
    settings.LLM_ROUTING_MODE = "hybrid"
