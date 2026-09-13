import json
import uuid
from datetime import datetime, timezone
import os

def generate_sbom():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Base CycloneDX 1.5 Metadata
    sbom = {
        "$schema": "http://cyclonedx.org/schema/bom-1.5.json",
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": f"urn:uuid:{uuid.uuid4()}",
        "version": 1,
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tools": [
                {
                    "vendor": "Sentinel-AI-SOC",
                    "name": "Sentinel-AI-SOC-SBOM-Generator",
                    "version": "1.0.0"
                }
            ],
            "authors": [
                {
                    "name": "Ankush Chouhan",
                    "email": "ankush.sec@gmail.com"
                }
            ],
            "component": {
                "type": "application",
                "bom-ref": "pkg:app/sentinel-soc-agent@1.0.0",
                "name": "sentinel-soc-agent",
                "version": "1.0.0",
                "description": "Autonomous AI SOC Incident Triage Platform for Microsoft Sentinel & Azure Log Analytics",
                "supplier": {
                    "name": "Sentinel AI SOC Project",
                    "url": ["https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel"]
                }
            }
        },
        "components": [],
        "dependencies": []
    }

    # 2. Add Base Container Images
    containers = [
        {
            "type": "container",
            "bom-ref": "pkg:docker/python@3.11-slim",
            "name": "python",
            "version": "3.11-slim",
            "purl": "pkg:docker/python@3.11-slim",
            "description": "Hardened Python 3.11 Debian Bookworm minimal runtime base image",
            "licenses": [{"license": {"id": "PSF-2.0"}}]
        },
        {
            "type": "container",
            "bom-ref": "pkg:docker/node@18-alpine",
            "name": "node",
            "version": "18-alpine",
            "purl": "pkg:docker/node@18-alpine",
            "description": "Multi-stage Node.js build container for frontend compilation",
            "licenses": [{"license": {"id": "MIT"}}]
        }
    ]
    sbom["components"].extend(containers)

    # 3. Add Python Packages
    python_packages = [
        {"name": "fastapi", "version": "0.141.1", "license": "MIT", "desc": "High performance async REST API framework"},
        {"name": "uvicorn", "version": "0.52.4", "license": "BSD-3-Clause", "desc": "High throughput ASGI web server"},
        {"name": "azure-identity", "version": "1.25.3", "license": "MIT", "desc": "Azure Active Directory / Entra ID token provider"},
        {"name": "azure-mgmt-securityinsight", "version": "2.0.0b3", "license": "MIT", "desc": "Microsoft Sentinel ARM REST client"},
        {"name": "azure-monitor-query", "version": "2.0.0", "license": "MIT", "desc": "Azure Log Analytics KQL query engine"},
        {"name": "openai", "version": "3.3.1", "license": "Apache-2.0", "desc": "Azure OpenAI LLM integration client"},
        {"name": "pydantic", "version": "2.13.4", "license": "MIT", "desc": "Data validation and settings management using Python type annotations"},
        {"name": "pydantic-settings", "version": "2.15.0", "license": "MIT", "desc": "Settings management using Pydantic V2"},
        {"name": "httpx", "version": "0.28.1", "license": "BSD-3-Clause", "desc": "Next generation async HTTP client"},
        {"name": "cryptography", "version": "50.0.0", "license": "Apache-2.0", "desc": "Cryptographic recipes and primitives"},
        {"name": "python-jose", "version": "3.5.0", "license": "MIT", "desc": "JOSE (JSON Object Signing and Encryption) implementation in Python"},
        {"name": "websockets", "version": "17.0.1", "license": "BSD-3-Clause", "desc": "Real-time investigation telemetry streaming"}
    ]

    for pkg in python_packages:
        ref = f"pkg:pypi/{pkg['name']}@{pkg['version']}"
        sbom["components"].append({
            "type": "library",
            "bom-ref": ref,
            "name": pkg["name"],
            "version": pkg["version"],
            "purl": ref,
            "description": pkg["desc"],
            "licenses": [{"license": {"id": pkg["license"]}}]
        })

    # 4. Add Frontend NPM Packages
    npm_packages = [
        {"name": "react", "version": "18.2.0", "license": "MIT", "desc": "The library for web and native user interfaces"},
        {"name": "react-dom", "version": "18.2.0", "license": "MIT", "desc": "React package for working with the DOM"},
        {"name": "lucide-react", "version": "0.359.0", "license": "ISC", "desc": "Lucide icons for React"},
        {"name": "axios", "version": "1.8.2", "license": "MIT", "desc": "Promise based HTTP client for the browser"},
        {"name": "tailwindcss", "version": "3.4.1", "license": "MIT", "desc": "A utility-first CSS framework for rapid UI development"},
        {"name": "vite", "version": "5.4.20", "license": "MIT", "desc": "Next Generation Frontend Tooling"}
    ]

    for pkg in npm_packages:
        ref = f"pkg:npm/{pkg['name']}@{pkg['version']}"
        sbom["components"].append({
            "type": "library",
            "bom-ref": ref,
            "name": pkg["name"],
            "version": pkg["version"],
            "purl": ref,
            "description": pkg["desc"],
            "licenses": [{"license": {"id": pkg["license"]}}]
        })

    # 5. Build Dependency Tree
    app_ref = "pkg:app/sentinel-soc-agent@1.0.0"
    all_refs = [c["bom-ref"] for c in sbom["components"]]
    sbom["dependencies"].append({
        "ref": app_ref,
        "dependsOn": all_refs
    })

    # 6. Save CycloneDX JSON
    output_path = os.path.join(base_dir, "sbom-cyclonedx.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sbom, f, indent=2)

    print(f"CycloneDX v1.5 SBOM generated successfully: {output_path}")
    print(f"Total Components Inventoried: {len(sbom['components'])}")
    return output_path

if __name__ == "__main__":
    generate_sbom()
