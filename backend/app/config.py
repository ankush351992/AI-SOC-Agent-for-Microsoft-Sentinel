from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    # Application Config
    APP_NAME: str = "Microsoft Sentinel AI Triage Agent"
    APP_ENV: str = "production"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: List[str] = ["*"]
    
    # JWT Authentication
    SECRET_KEY: str = "sentinel-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12 # 12 hours
    ADMIN_USERNAME: str = "soc_admin"
    ADMIN_PASSWORD: Optional[str] = None
    
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
