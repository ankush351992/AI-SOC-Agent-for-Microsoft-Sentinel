import json
from typing import Dict, Any
from app.services.kql_runner import kql_runner
from app.services.threat_intel import threat_intel_service
from app.services.sentinel_client import sentinel_client

AGENT_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "run_kql_query",
            "description": "Execute a Kusto Query Language (KQL) query against Microsoft Sentinel / Azure Log Analytics workspace (e.g. against SigninLogs, DeviceProcessEvents, DeviceNetworkEvents, SecurityEvent).",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The valid KQL query string to execute."
                    },
                    "timespan_hours": {
                        "type": "integer",
                        "description": "Time window to search in hours (default: 24)."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_ip_reputation",
            "description": "Check the threat intelligence reputation of an IP address using AbuseIPDB and global threat feeds.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ip_address": {
                        "type": "string",
                        "description": "The IPv4 or IPv6 address to check."
                    }
                },
                "required": ["ip_address"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_file_hash",
            "description": "Check a SHA256, SHA1, or MD5 file hash against VirusTotal threat database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_hash": {
                        "type": "string",
                        "description": "The hash of the file or process artifact."
                    }
                },
                "required": ["file_hash"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_microsoft_threat_intel",
            "description": "Correlate an IP address, file hash, or domain against Microsoft Defender Threat Intelligence (MDTI) and Sentinel ThreatIntelligenceIndicator feeds.",
            "parameters": {
                "type": "object",
                "properties": {
                    "indicator": {
                        "type": "string",
                        "description": "The IP address, domain, or file hash to check."
                    },
                    "indicator_type": {
                        "type": "string",
                        "enum": ["ip", "hash", "domain"],
                        "description": "Type of indicator (default: ip)."
                    }
                },
                "required": ["indicator"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "post_sentinel_comment",
            "description": "Post an investigation note, summary, or report comment to the Microsoft Sentinel incident.",
            "parameters": {
                "type": "object",
                "properties": {
                    "incident_id": {
                        "type": "string",
                        "description": "The ID of the Sentinel incident."
                    },
                    "comment_text": {
                        "type": "string",
                        "description": "The markdown-formatted note or report to post."
                    }
                },
                "required": ["incident_id", "comment_text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_sentinel_incident",
            "description": "Update status, severity, or classification tags of a Microsoft Sentinel incident.",
            "parameters": {
                "type": "object",
                "properties": {
                    "incident_id": {
                        "type": "string",
                        "description": "The ID of the Sentinel incident."
                    },
                    "status": {
                        "type": "string",
                        "enum": ["Active", "Closed", "New"],
                        "description": "New incident status."
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["High", "Medium", "Low", "Informational"],
                        "description": "Adjusted severity if warranted."
                    },
                    "classification": {
                        "type": "string",
                        "enum": ["TruePositive", "FalsePositive", "BenignPositive", "Undetermined"],
                        "description": "Classification result."
                    },
                    "labels": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags to apply to the incident."
                    }
                },
                "required": ["incident_id", "status"]
            }
        }
    }
]

async def execute_tool_call(tool_name: str, arguments_json: str) -> Dict[str, Any]:
    """Execute the matching Python tool based on LLM function call"""
    try:
        args = json.loads(arguments_json) if isinstance(arguments_json, str) else arguments_json
    except Exception:
        args = {}

    if tool_name == "run_kql_query":
        query = args.get("query", "")
        timespan = args.get("timespan_hours", 24)
        return await kql_runner.execute_kql(query, timespan_hours=timespan)

    elif tool_name == "check_ip_reputation":
        ip = args.get("ip_address", "")
        return await threat_intel_service.lookup_ip_reputation(ip)

    elif tool_name == "check_file_hash":
        h = args.get("file_hash", "")
        return await threat_intel_service.lookup_file_hash(h)

    elif tool_name == "check_microsoft_threat_intel":
        indicator = args.get("indicator", "")
        ind_type = args.get("indicator_type", "ip")
        return await threat_intel_service.lookup_microsoft_threat_intel(indicator, indicator_type=ind_type)

    elif tool_name == "post_sentinel_comment":
        inc_id = args.get("incident_id", "")
        comment = args.get("comment_text", "")
        return await sentinel_client.add_comment(inc_id, comment)

    elif tool_name == "update_sentinel_incident":
        return await sentinel_client.update_status(
            incident_id=args.get("incident_id"),
            status=args.get("status", "Active"),
            severity=args.get("severity"),
            classification=args.get("classification"),
            labels=args.get("labels")
        )

    return {"error": f"Tool '{tool_name}' not recognized."}
