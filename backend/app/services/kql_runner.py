import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.config import settings

logger = logging.getLogger(__name__)

class KQLRunner:
    def __init__(self):
        self.workspace_id = settings.AZURE_WORKSPACE_ID
        self.client = None
        self._init_azure_client()

    def _resolve_workspace_guid(self) -> Optional[str]:
        """Auto-resolve Log Analytics Workspace GUID (customerId) from Azure ARM if only workspace name is available"""
        if settings.AZURE_WORKSPACE_ID and len(settings.AZURE_WORKSPACE_ID) > 30 and '-' in settings.AZURE_WORKSPACE_ID:
            return settings.AZURE_WORKSPACE_ID

        if settings.AZURE_SUBSCRIPTION_ID and settings.AZURE_RESOURCE_GROUP_NAME and settings.AZURE_WORKSPACE_NAME:
            try:
                from app.services.sentinel_client import sentinel_client
                token = sentinel_client._get_arm_token()
                if token:
                    url = f"https://management.azure.com/subscriptions/{settings.AZURE_SUBSCRIPTION_ID}/resourceGroups/{settings.AZURE_RESOURCE_GROUP_NAME}/providers/Microsoft.OperationalInsights/workspaces/{settings.AZURE_WORKSPACE_NAME}?api-version=2022-10-01"
                    with httpx.Client(timeout=10.0) as client:
                        resp = client.get(url, headers={"Authorization": f"Bearer {token}"})
                        if resp.status_code == 200:
                            cust_id = resp.json().get("properties", {}).get("customerId")
                            if cust_id:
                                logger.info(f"Resolved Log Analytics Workspace GUID for '{settings.AZURE_WORKSPACE_NAME}': {cust_id}")
                                settings.AZURE_WORKSPACE_ID = cust_id
                                return cust_id
            except Exception as e:
                logger.debug(f"Could not auto-resolve workspace GUID from ARM: {e}")

        return settings.AZURE_WORKSPACE_ID or settings.AZURE_WORKSPACE_NAME

    def _init_azure_client(self):
        resolved_ws_id = self._resolve_workspace_guid()
        self.workspace_id = resolved_ws_id

        has_creds = bool(
            (settings.USE_MANAGED_IDENTITY) or
            (settings.AZURE_TENANT_ID and settings.AZURE_CLIENT_ID and settings.AZURE_CLIENT_SECRET)
        )
        if not settings.DEMO_MODE and self.workspace_id and has_creds:
            try:
                from azure.identity import DefaultAzureCredential, ClientSecretCredential
                from azure.monitor.query import LogsQueryClient

                if settings.USE_MANAGED_IDENTITY:
                    credential = DefaultAzureCredential()
                elif settings.AZURE_TENANT_ID and settings.AZURE_CLIENT_ID and settings.AZURE_CLIENT_SECRET:
                    credential = ClientSecretCredential(
                        tenant_id=settings.AZURE_TENANT_ID,
                        client_id=settings.AZURE_CLIENT_ID,
                        client_secret=settings.AZURE_CLIENT_SECRET
                    )
                else:
                    credential = DefaultAzureCredential()

                self.client = LogsQueryClient(credential)
                logger.info(f"Initialized Azure Monitor LogsQueryClient successfully for Workspace GUID {self.workspace_id}.")
            except Exception as e:
                logger.warning(f"Failed to initialize Azure Monitor client (fallback to simulation): {e}")
                self.client = None
        else:
            self.client = None

    async def execute_kql(self, query: str, timespan_hours: int = 24) -> Dict[str, Any]:
        """Execute a KQL query against Azure Log Analytics or generate simulated SOC log results"""
        logger.info(f"Executing KQL query (timespan {timespan_hours}h): {query[:100]}...")

        # Ensure live client is initialized with valid Workspace GUID
        if not self.client or not self.workspace_id or ('-' not in str(self.workspace_id)):
            self._init_azure_client()

        # If live Azure client is active
        if self.client and self.workspace_id and not settings.DEMO_MODE:
            try:
                timespan = timedelta(hours=timespan_hours)
                start_time = datetime.utcnow()
                response = self.client.query_workspace(
                    workspace_id=self.workspace_id,
                    query=query,
                    timespan=timespan
                )
                latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                tables = []
                for table in response.tables:
                    columns = [col.name if hasattr(col, "name") else str(col) for col in table.columns]
                    rows = []
                    for row in table.rows:
                        row_dict = {}
                        for col_name, val in zip(columns, row):
                            # Convert datetime or non-serializable objects
                            if hasattr(val, "isoformat"):
                                row_dict[col_name] = val.isoformat() + "Z"
                            elif isinstance(val, (dict, list, str, int, float, bool)) or val is None:
                                row_dict[col_name] = val
                            else:
                                row_dict[col_name] = str(val)
                        rows.append(row_dict)
                    tables.append({"name": getattr(table, "name", "PrimaryResult"), "columns": columns, "rows": rows, "count": len(rows)})
                
                total_rows = sum(t["count"] for t in tables)
                logger.info(f"KQL Query executed successfully in {latency_ms}ms, returned {total_rows} rows.")
                return {
                    "status": "SUCCESS",
                    "source": "AZURE_LOG_ANALYTICS (LIVE)",
                    "workspace_id": self.workspace_id,
                    "workspace_name": settings.AZURE_WORKSPACE_NAME,
                    "query": query,
                    "latency_ms": latency_ms,
                    "tables": tables,
                    "row_count": total_rows
                }
            except Exception as e:
                logger.error(f"Error querying Log Analytics: {e}")
                return {
                    "status": "ERROR",
                    "source": "AZURE_LOG_ANALYTICS (LIVE)",
                    "workspace_name": settings.AZURE_WORKSPACE_NAME,
                    "error": str(e)
                }

        # Simulated KQL execution based on query patterns
        query_lower = query.lower()
        rows = []
        columns = []

        if "signinlogs" in query_lower:
            columns = ["TimeGenerated", "UserPrincipalName", "IPAddress", "Location", "ResultType", "AppDisplayName", "RiskLevelDuringSignIn"]
            if "fail" in query_lower or "resulttype != 0" in query_lower or "spray" in query_lower:
                for i in range(1, 8):
                    rows.append({
                        "TimeGenerated": (datetime.utcnow() - timedelta(minutes=15 * i)).isoformat() + "Z",
                        "UserPrincipalName": "jdoe@cybersecurity.corp",
                        "IPAddress": "185.220.101.5",
                        "Location": "Russia",
                        "ResultType": "50126",
                        "AppDisplayName": "Azure Portal",
                        "RiskLevelDuringSignIn": "high"
                    })
            else:
                rows = [
                    {
                        "TimeGenerated": (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z",
                        "UserPrincipalName": "jdoe@cybersecurity.corp",
                        "IPAddress": "185.220.101.5",
                        "Location": "Russia",
                        "ResultType": "0",
                        "AppDisplayName": "Microsoft Office 365 Portal",
                        "RiskLevelDuringSignIn": "high"
                    },
                    {
                        "TimeGenerated": (datetime.utcnow() - timedelta(days=2)).isoformat() + "Z",
                        "UserPrincipalName": "jdoe@cybersecurity.corp",
                        "IPAddress": "198.51.100.4",
                        "Location": "United States (Austin, TX)",
                        "ResultType": "0",
                        "AppDisplayName": "Microsoft Office 365 Portal",
                        "RiskLevelDuringSignIn": "none"
                    }
                ]

        elif "deviceprocessevents" in query_lower or "securityevent" in query_lower:
            columns = ["TimeGenerated", "DeviceName", "AccountName", "FileName", "FolderPath", "ProcessCommandLine", "InitiatingProcessFileName"]
            rows = [
                {
                    "TimeGenerated": (datetime.utcnow() - timedelta(minutes=45)).isoformat() + "Z",
                    "DeviceName": "WKS-EXEC-094",
                    "AccountName": "jdoe",
                    "FileName": "powershell.exe",
                    "FolderPath": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                    "ProcessCommandLine": "powershell.exe -nop -w hidden -enc JABzACAAPQAgAE4AZQB3AC0ATwBiAGoAZQBjAHQA...",
                    "InitiatingProcessFileName": "WINWORD.EXE"
                },
                {
                    "TimeGenerated": (datetime.utcnow() - timedelta(minutes=44)).isoformat() + "Z",
                    "DeviceName": "WKS-EXEC-094",
                    "AccountName": "jdoe",
                    "FileName": "whoami.exe",
                    "FolderPath": "C:\\Windows\\System32\\whoami.exe",
                    "ProcessCommandLine": "whoami /priv",
                    "InitiatingProcessFileName": "powershell.exe"
                }
            ]

        elif "devicenetworkevents" in query_lower or "commonsecuritylog" in query_lower:
            columns = ["TimeGenerated", "DeviceName", "RemoteIP", "RemotePort", "RemoteUrl", "ActionType"]
            rows = [
                {
                    "TimeGenerated": (datetime.utcnow() - timedelta(minutes=40)).isoformat() + "Z",
                    "DeviceName": "WKS-EXEC-094",
                    "RemoteIP": "45.148.10.12",
                    "RemotePort": 443,
                    "RemoteUrl": "https://update-azure-cdn-service.net/beacon",
                    "ActionType": "ConnectionSuccess"
                }
            ]

        elif "aaduserstatus" in query_lower or "identity" in query_lower:
            columns = ["UserPrincipalName", "Department", "IsPrivileged", "RiskLevel", "MFAEnabled"]
            rows = [
                {
                    "UserPrincipalName": "jdoe@cybersecurity.corp",
                    "Department": "Finance & Executive Operations",
                    "IsPrivileged": "True (Global Reader, Billing Admin)",
                    "RiskLevel": "High",
                    "MFAEnabled": "True"
                }
            ]

        else:
            columns = ["TimeGenerated", "Activity", "Source", "Result"]
            rows = [
                {
                    "TimeGenerated": datetime.utcnow().isoformat() + "Z",
                    "Activity": "Security Baseline Query Executed",
                    "Source": "Microsoft Sentinel Log Analytics",
                    "Result": "No abnormal anomalies matching filter found in standard baseline window."
                }
            ]

        return {
            "status": "SUCCESS",
            "source": "SIMULATED_LOG_ANALYTICS (DEMO)",
            "query": query,
            "timespan_hours": timespan_hours,
            "tables": [
                {
                    "name": "PrimaryResult",
                    "columns": columns,
                    "rows": rows,
                    "count": len(rows)
                }
            ],
            "row_count": len(rows)
        }

kql_runner = KQLRunner()
