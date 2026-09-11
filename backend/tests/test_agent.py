import pytest
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
    assert len(events_captured) > 0
    assert any(e["event"] == "INVESTIGATION_STARTED" for e in events_captured)
    assert any(e["event"] == "VERDICT_GENERATED" for e in events_captured)
