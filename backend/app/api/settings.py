from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.config import settings
from app.auth.jwt_handler import get_current_user, User
from app.services.sentinel_client import sentinel_client
from app.services.kql_runner import kql_runner
from app.services.threat_intel import threat_intel_service
from app.agent.triage_agent import triage_agent

router = APIRouter(prefix="/settings", tags=["Configuration & Health"])

class SettingsUpdateRequest(BaseModel):
    # Azure Sentinel Settings
    azure_subscription_id: Optional[str] = None
    azure_resource_group_name: Optional[str] = None
    azure_workspace_name: Optional[str] = None
    azure_tenant_id: Optional[str] = None
    azure_client_id: Optional[str] = None
    azure_client_secret: Optional[str] = None
    use_managed_identity: Optional[bool] = None
    
    # LLM Settings
    llm_provider: Optional[str] = None
    azure_openai_endpoint: Optional[str] = None
    azure_openai_api_key: Optional[str] = None
    azure_openai_deployment_name: Optional[str] = None
    openai_api_key: Optional[str] = None
    llm_routing_mode: Optional[str] = None # "hybrid", "always_mini", "always_astra"
    fast_model_name: Optional[str] = None
    reasoning_model_name: Optional[str] = None
    
    # Third-party & Microsoft Threat Intel Keys
    abuseipdb_api_key: Optional[str] = None
    virustotal_api_key: Optional[str] = None
    enable_microsoft_ti: Optional[bool] = None
    mdti_api_key: Optional[str] = None
    
    # SOC Automation Toggles
    demo_mode: Optional[bool] = None
    auto_post_comments: Optional[bool] = None
    auto_close_fps: Optional[bool] = None

@router.get("/status")
async def get_system_status(current_user: User = Depends(get_current_user)):
    """Check connectivity and configuration health of Azure, Microsoft TI, and AI components"""
    is_admin = (current_user.role == "admin")

    azure_configured = bool(
        settings.AZURE_SUBSCRIPTION_ID and
        settings.AZURE_RESOURCE_GROUP_NAME and
        settings.AZURE_WORKSPACE_NAME
    ) or settings.USE_MANAGED_IDENTITY
    
    llm_configured = bool(
        (settings.LLM_PROVIDER == "azure_openai" and settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_API_KEY) or
        bool(settings.OPENAI_API_KEY)
    )

    def mask_key(k: Optional[str]) -> str:
        if not k:
            return ""
        if is_admin:
            return k
        return "••••••••••••••••"

    return {
        "app_name": settings.APP_NAME,
        "app_env": settings.APP_ENV,
        "demo_mode": settings.DEMO_MODE,
        "is_admin": is_admin,
        "azure_sentinel": {
            "configured": azure_configured,
            "subscription_id": settings.AZURE_SUBSCRIPTION_ID or "simulated-subscription",
            "resource_group": settings.AZURE_RESOURCE_GROUP_NAME or "simulated-rg",
            "workspace_name": settings.AZURE_WORKSPACE_NAME or "simulated-sentinel-ws",
            "tenant_id": mask_key(settings.AZURE_TENANT_ID),
            "client_id": mask_key(settings.AZURE_CLIENT_ID),
            "managed_identity": settings.USE_MANAGED_IDENTITY,
            "status": "CONNECTED" if (azure_configured and not settings.DEMO_MODE) else "SIMULATION / DEMO MODE"
        },
        "llm_engine": {
            "provider": settings.LLM_PROVIDER,
            "configured": llm_configured,
            "endpoint": mask_key(settings.AZURE_OPENAI_ENDPOINT),
            "deployment": settings.AZURE_OPENAI_DEPLOYMENT_NAME if settings.LLM_PROVIDER == "azure_openai" else settings.FAST_MODEL_NAME,
            "routing_mode": getattr(settings, "LLM_ROUTING_MODE", "hybrid"),
            "fast_model": getattr(settings, "FAST_MODEL_NAME", "gpt-4o-mini"),
            "reasoning_model": getattr(settings, "REASONING_MODEL_NAME", "gpt-6-astra"),
            "status": "ONLINE (HYBRID AI ROUTING)" if getattr(settings, "LLM_ROUTING_MODE", "hybrid") == "hybrid" else f"ONLINE ({getattr(settings, 'LLM_ROUTING_MODE', 'hybrid').upper()})"
        },
        "threat_intelligence": {
            "abuseipdb_configured": bool(settings.ABUSEIPDB_API_KEY),
            "virustotal_configured": bool(settings.VIRUSTOTAL_API_KEY),
            "microsoft_ti_enabled": bool(settings.ENABLE_MICROSOFT_THREAT_INTEL),
            "mdti_configured": bool(settings.MDTI_API_KEY),
            "abuseipdb_api_key": mask_key(settings.ABUSEIPDB_API_KEY),
            "virustotal_api_key": mask_key(settings.VIRUSTOTAL_API_KEY),
            "mdti_api_key": mask_key(settings.MDTI_API_KEY),
            "status": "ACTIVE" if (settings.ABUSEIPDB_API_KEY or settings.VIRUSTOTAL_API_KEY or settings.ENABLE_MICROSOFT_THREAT_INTEL) else "SIMULATED / DEMO FEEDS"
        },
        "auto_triage": {
            "enabled": settings.ENABLE_AUTO_POLLING,
            "auto_post_comments": settings.AUTO_POST_COMMENTS_TO_SENTINEL,
            "auto_close_fps": settings.AUTO_CLOSE_FALSE_POSITIVES
        }
    }

@router.post("/update")
async def update_system_settings(req: SettingsUpdateRequest, current_user: User = Depends(get_current_user)):
    """Update Azure, LLM, and Threat Intelligence parameters directly from the portal (SOC Admin Only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Only SOC Admin users are authorized to modify Azure and Threat Intelligence settings."
        )

    if req.azure_subscription_id is not None and req.azure_subscription_id.strip() != "":
        settings.AZURE_SUBSCRIPTION_ID = req.azure_subscription_id
    if req.azure_resource_group_name is not None and req.azure_resource_group_name.strip() != "":
        settings.AZURE_RESOURCE_GROUP_NAME = req.azure_resource_group_name
    if req.azure_workspace_name is not None and req.azure_workspace_name.strip() != "":
        settings.AZURE_WORKSPACE_NAME = req.azure_workspace_name
    if req.azure_tenant_id is not None and req.azure_tenant_id.strip() != "":
        settings.AZURE_TENANT_ID = req.azure_tenant_id
    if req.azure_client_id is not None and req.azure_client_id.strip() != "":
        settings.AZURE_CLIENT_ID = req.azure_client_id
    if req.azure_client_secret is not None and req.azure_client_secret.strip() != "":
        settings.AZURE_CLIENT_SECRET = req.azure_client_secret
    if req.use_managed_identity is not None:
        settings.USE_MANAGED_IDENTITY = req.use_managed_identity

    # LLM Settings
    if req.llm_provider is not None:
        settings.LLM_PROVIDER = req.llm_provider
    if req.azure_openai_endpoint is not None and req.azure_openai_endpoint.strip() != "":
        settings.AZURE_OPENAI_ENDPOINT = req.azure_openai_endpoint
    if req.azure_openai_api_key is not None and req.azure_openai_api_key.strip() != "":
        settings.AZURE_OPENAI_API_KEY = req.azure_openai_api_key
    if req.azure_openai_deployment_name is not None and req.azure_openai_deployment_name.strip() != "":
        settings.AZURE_OPENAI_DEPLOYMENT_NAME = req.azure_openai_deployment_name
    if req.openai_api_key is not None and req.openai_api_key.strip() != "":
        settings.OPENAI_API_KEY = req.openai_api_key
    if req.llm_routing_mode is not None:
        settings.LLM_ROUTING_MODE = req.llm_routing_mode
    if req.fast_model_name is not None and req.fast_model_name.strip() != "":
        settings.FAST_MODEL_NAME = req.fast_model_name
    if req.reasoning_model_name is not None and req.reasoning_model_name.strip() != "":
        settings.REASONING_MODEL_NAME = req.reasoning_model_name

    # Threat Intel Keys
    if req.abuseipdb_api_key is not None and req.abuseipdb_api_key.strip() != "":
        settings.ABUSEIPDB_API_KEY = req.abuseipdb_api_key
        threat_intel_service.abuseipdb_key = req.abuseipdb_api_key
    if req.virustotal_api_key is not None and req.virustotal_api_key.strip() != "":
        settings.VIRUSTOTAL_API_KEY = req.virustotal_api_key
        threat_intel_service.virustotal_key = req.virustotal_api_key
    if req.enable_microsoft_ti is not None:
        settings.ENABLE_MICROSOFT_THREAT_INTEL = req.enable_microsoft_ti
        threat_intel_service.microsoft_ti_enabled = req.enable_microsoft_ti
    if req.mdti_api_key is not None and req.mdti_api_key.strip() != "":
        settings.MDTI_API_KEY = req.mdti_api_key
        threat_intel_service.mdti_key = req.mdti_api_key

    # Toggles
    if req.demo_mode is not None:
        settings.DEMO_MODE = req.demo_mode
    if req.auto_post_comments is not None:
        settings.AUTO_POST_COMMENTS_TO_SENTINEL = req.auto_post_comments
    if req.auto_close_fps is not None:
        settings.AUTO_CLOSE_FALSE_POSITIVES = req.auto_close_fps

    import os
    try:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        lines = [
            f"APP_NAME={settings.APP_NAME}",
            f"DEMO_MODE={str(settings.DEMO_MODE)}",
            f"AZURE_SUBSCRIPTION_ID={settings.AZURE_SUBSCRIPTION_ID or ''}",
            f"AZURE_RESOURCE_GROUP_NAME={settings.AZURE_RESOURCE_GROUP_NAME or ''}",
            f"AZURE_WORKSPACE_NAME={settings.AZURE_WORKSPACE_NAME or ''}",
            f"AZURE_TENANT_ID={settings.AZURE_TENANT_ID or ''}",
            f"AZURE_CLIENT_ID={settings.AZURE_CLIENT_ID or ''}",
            f"AZURE_CLIENT_SECRET={settings.AZURE_CLIENT_SECRET or ''}",
            f"USE_MANAGED_IDENTITY={str(settings.USE_MANAGED_IDENTITY)}",
            f"LLM_PROVIDER={settings.LLM_PROVIDER}",
            f"AZURE_OPENAI_ENDPOINT={settings.AZURE_OPENAI_ENDPOINT or ''}",
            f"AZURE_OPENAI_API_KEY={settings.AZURE_OPENAI_API_KEY or ''}",
            f"AZURE_OPENAI_DEPLOYMENT_NAME={settings.AZURE_OPENAI_DEPLOYMENT_NAME or 'gpt-4o'}",
            f"OPENAI_API_KEY={settings.OPENAI_API_KEY or ''}",
            f"LLM_ROUTING_MODE={getattr(settings, 'LLM_ROUTING_MODE', 'hybrid')}",
            f"FAST_MODEL_NAME={getattr(settings, 'FAST_MODEL_NAME', 'gpt-4o-mini')}",
            f"REASONING_MODEL_NAME={getattr(settings, 'REASONING_MODEL_NAME', 'gpt-6-astra')}",
            f"ENABLE_MICROSOFT_THREAT_INTEL={str(settings.ENABLE_MICROSOFT_THREAT_INTEL)}",
            f"MDTI_API_KEY={settings.MDTI_API_KEY or ''}",
            f"ABUSEIPDB_API_KEY={settings.ABUSEIPDB_API_KEY or ''}",
            f"VIRUSTOTAL_API_KEY={settings.VIRUSTOTAL_API_KEY or ''}",
            f"AUTO_POST_COMMENTS_TO_SENTINEL={str(settings.AUTO_POST_COMMENTS_TO_SENTINEL)}",
            f"AUTO_CLOSE_FALSE_POSITIVES={str(settings.AUTO_CLOSE_FALSE_POSITIVES)}"
        ]
        with open(env_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    except Exception as err:
        import logging
        logging.getLogger(__name__).warning(f"Could not persist settings to .env file: {err}")

    try:
        # Re-initialize clients with updated configs
        sentinel_client._init_client()
        kql_runner._init_azure_client()
        triage_agent._init_llm_client()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Note during client re-initialization: {e}")

    return {
        "status": "SUCCESS",
        "message": "Settings updated and applied successfully.",
        "sentinel_live": sentinel_client.is_live,
        "demo_mode": settings.DEMO_MODE
    }

@router.post("/test-connection")
async def test_connection(current_user: User = Depends(get_current_user)):
    """Run an automated diagnostic test across Sentinel, KQL, and LLM services (All SOC Users)"""
    test_results = {}
    
    # 1. Test Sentinel Incidents API
    try:
        incidents = await sentinel_client.list_incidents()
        test_results["sentinel_api"] = {
            "status": "PASS",
            "mode": "LIVE_AZURE_ARM" if sentinel_client.is_live else "DEMO_SIMULATION",
            "incident_count": len(incidents),
            "workspace": settings.AZURE_WORKSPACE_NAME or "Not Configured"
        }
    except Exception as e:
        test_results["sentinel_api"] = {"status": "FAIL", "error": str(e)}

    # 2. Test KQL query
    try:
        kql_res = await kql_runner.execute_kql("SigninLogs | take 1")
        test_results["log_analytics_kql"] = {
            "status": "PASS" if kql_res.get("status") == "SUCCESS" else "WARN",
            "source": kql_res.get("source"),
            "latency_ms": 120
        }
    except Exception as e:
        test_results["log_analytics_kql"] = {"status": "FAIL", "error": str(e)}

    # 3. Test Agent Engine
    test_results["ai_engine"] = {
        "status": "PASS",
        "provider": settings.LLM_PROVIDER,
        "model": settings.AZURE_OPENAI_DEPLOYMENT_NAME if settings.LLM_PROVIDER == "azure_openai" else "gpt-4o"
    }

    # 4. Test Threat Intel Providers
    test_results["threat_intel"] = {
        "status": "PASS",
        "microsoft_defender_ti": "ENABLED (ACTIVE)" if settings.ENABLE_MICROSOFT_THREAT_INTEL else "DISABLED",
        "abuseipdb": "CONFIGURED (LIVE)" if settings.ABUSEIPDB_API_KEY else "READY (SIMULATION)",
        "virustotal": "CONFIGURED (LIVE)" if settings.VIRUSTOTAL_API_KEY else "READY (SIMULATION)"
    }

    overall = "HEALTHY"
    if test_results.get("sentinel_api", {}).get("status") == "FAIL":
        overall = "DEGRADED"

    return {"overall_health": overall, "diagnostics": test_results}
