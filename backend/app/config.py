import logging
import secrets
from pydantic_settings import BaseSettings
from typing import Optional, List

# Placeholder JWT keys that have been published in this repository and must never be used
KNOWN_INSECURE_SECRET_KEYS = {
    "sentinel-super-secret-key-change-in-production-2026",
    "change-to-a-secure-random-secret-key-for-jwt",
    "generate-a-secure-random-256-bit-key-for-jwt-here",
    "replace-with-a-secure-random-secret-key-in-production",
}
MIN_SECRET_KEY_LENGTH = 32

class Settings(BaseSettings):
    # Application Config
    APP_NAME: str = "Microsoft Sentinel AI Triage Agent"
    APP_ENV: str = "production"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: List[str] = ["*"]
    
    # JWT Authentication
    SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12 # 12 hours
    ADMIN_USERNAME: str = "soc_admin"
    ADMIN_PASSWORD: Optional[str] = "SentinelAdmin2026!"
    
    # Azure Sentinel & Azure Resource Manager Config
    AZURE_TENANT_ID: Optional[str] = None
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None
    AZURE_SUBSCRIPTION_ID: Optional[str] = None
    AZURE_RESOURCE_GROUP_NAME: Optional[str] = None
    AZURE_WORKSPACE_NAME: Optional[str] = None
    AZURE_WORKSPACE_ID: Optional[str] = None # Log Analytics Workspace ID
    USE_MANAGED_IDENTITY: bool = False
    
    # Simulation / Demo Mode (allows running standalone without live Azure credentials)
    DEMO_MODE: bool = True
    
    # LLM Settings (Supports Azure OpenAI, OpenAI, or compatible APIs)
    LLM_PROVIDER: str = "azure_openai" # "azure_openai", "openai", "custom"
    OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    AZURE_OPENAI_DEPLOYMENT_NAME: str = "gpt-4o-mini"
    LLM_ROUTING_MODE: str = "hybrid" # "hybrid", "always_mini", "always_astra"
    FAST_MODEL_NAME: str = "gpt-4o-mini"
    REASONING_MODEL_NAME: str = "gpt-6-astra"
    
    # Threat Intelligence API Keys & Providers
    ABUSEIPDB_API_KEY: Optional[str] = None
    VIRUSTOTAL_API_KEY: Optional[str] = None
    ENABLE_MICROSOFT_THREAT_INTEL: bool = True
    MDTI_API_KEY: Optional[str] = None
    
    # Auto-Triage & Polling Settings
    ENABLE_AUTO_POLLING: bool = False
    POLL_INTERVAL_SECONDS: int = 120
    AUTO_POST_COMMENTS_TO_SENTINEL: bool = True
    AUTO_CLOSE_FALSE_POSITIVES: bool = False
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

def _ensure_secure_secret_key(cfg: Settings) -> None:
    """
    Refuse to sign JWTs with a missing, short, or publicly known key.
    In DEMO_MODE a random per-process key is generated (tokens are invalidated on restart);
    in live mode the application refuses to start.
    """
    key = cfg.SECRET_KEY
    if key and len(key) >= MIN_SECRET_KEY_LENGTH and key not in KNOWN_INSECURE_SECRET_KEYS:
        return
    if not cfg.DEMO_MODE:
        raise RuntimeError(
            "SECRET_KEY is missing, shorter than 32 characters, or a published placeholder. "
            "Set SECRET_KEY to a random value, e.g. `python -c \"import secrets; print(secrets.token_urlsafe(64))\"`."
        )
    cfg.SECRET_KEY = secrets.token_urlsafe(64)
    logging.getLogger("sentinel_soc_agent.config").warning(
        "SECRET_KEY not set or insecure; generated an ephemeral JWT signing key for DEMO_MODE. "
        "Tokens will be invalidated on restart."
    )

_ensure_secure_secret_key(settings)
