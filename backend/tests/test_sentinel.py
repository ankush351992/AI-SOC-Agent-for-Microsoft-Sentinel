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
