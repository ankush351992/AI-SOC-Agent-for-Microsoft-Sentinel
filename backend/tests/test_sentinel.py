import pytest
from app.services.sentinel_client import sentinel_client
from app.services.threat_intel import threat_intel_service
from app.services.kql_runner import kql_runner

@pytest.mark.asyncio
async def test_list_incidents():
    incidents = await sentinel_client.list_incidents()
    assert len(incidents) > 0
    assert "title" in incidents[0]
    assert "severity" in incidents[0]

@pytest.mark.asyncio
async def test_threat_intel_private_ip():
    res = await threat_intel_service.lookup_ip_reputation("192.168.1.50")
    assert res["is_private"] is True
    assert res["verdict"] == "BENIGN_INTERNAL"

@pytest.mark.asyncio
async def test_threat_intel_malicious_ip():
    res = await threat_intel_service.lookup_ip_reputation("185.220.101.5")
    assert res["abuse_confidence_score"] > 70
    assert res["verdict"] == "MALICIOUS"

@pytest.mark.asyncio
async def test_kql_execution():
    query = "SigninLogs | take 5"
    res = await kql_runner.execute_kql(query)
    assert res["status"] == "SUCCESS"
    assert len(res["tables"]) > 0

@pytest.mark.asyncio
async def test_get_playbooks():
    playbooks = await sentinel_client.get_playbooks()
    assert len(playbooks) >= 8
    names = [p["name"] for p in playbooks]
    assert "SOAR-Isolate-Endpoint-LogicApp" in names
    assert "SOAR-Revoke-User-Sessions-LogicApp" in names
    assert "SOAR-Block-Malicious-IP-LogicApp" in names
    assert "SOAR-Full-Incident-Containment-Playbook" in names

@pytest.mark.asyncio
async def test_trigger_playbook():
    from app.services.remediation_service import remediation_service
    res = await remediation_service.execute_remediation(
        incident_id="inc-2026-9041",
        action_type="trigger_playbook",
        entity="Incident #9041",
        analyst_name="Test Analyst",
        parameters={"playbook_name": "SOAR-Revoke-User-Sessions-LogicApp", "notes": "Test containment"}
    )
    assert res["status"] == "SUCCESS"
    assert "run_id" in res
    assert res["playbook_name"] == "SOAR-Revoke-User-Sessions-LogicApp"
    assert "Playbook:SOAR-Revoke-User-Sessions-LogicApp" in res["applied_tags"]
    assert "SOAR-Automated" in res["applied_tags"]
