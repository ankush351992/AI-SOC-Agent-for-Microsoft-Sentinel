# 📋 Software Bill of Materials (SBOM) Report

**Application:** Sentinel AI SOC - Autonomous Incident Triage Platform  
**Author / Maintainer:** Ankush Chouhan ([https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel](https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel))  
**Standard Compliance:** CycloneDX v1.5 JSON (Spec 1.5), NTIA Minimum Elements, CISA SBOM Framework  
**Target Platform:** Azure Container Apps / Azure Kubernetes Service (AKS) / Linux OCI Container  

---

## 1. Executive Summary

This Software Bill of Materials (SBOM) provides a complete inventory of all software dependencies, base container images, libraries, licenses, and Package URLs (PURL) used in the **Sentinel AI SOC Agent Platform**.

* **Primary CycloneDX SBOM File:** [`sbom-cyclonedx.json`](file:///C:/Users/042748/.gemini/antigravity/scratch/sentinel-soc-agent/sbom-cyclonedx.json)
* **Automated Generator Script:** [`generate-sbom.py`](file:///C:/Users/042748/.gemini/antigravity/scratch/sentinel-soc-agent/generate-sbom.py)

---

## 2. Component Inventory Table

### A. Container Base Images
| Component | Version / Tag | Ecosystem | License | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`python:3.11-slim`** | `3.11-slim` (Debian Bookworm) | OCI Container | PSF-2.0 | Minimal hardened runtime container |
| **`node:18-alpine`** | `18-alpine` | OCI Container | MIT | Multi-stage frontend asset compilation |

---

### B. Backend Services & AI Agent Engine (Python / PyPI)
| Package Name | Version | License | Package URL (purl) | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`fastapi`** | `0.141.1` | MIT | `pkg:pypi/fastapi@0.141.1` | REST API framework & async endpoints |
| **`uvicorn`** | `0.52.4` | BSD-3-Clause | `pkg:pypi/uvicorn@0.52.4` | High-performance ASGI web server |
| **`pydantic`** | `2.13.4` | MIT | `pkg:pypi/pydantic@2.13.4` | Data validation & schema serialization |
| **`pydantic-settings`**| `2.15.0` | MIT | `pkg:pypi/pydantic-settings@2.15.0` | Environment configuration & secrets parsing |
| **`azure-identity`** | `1.25.3` | MIT | `pkg:pypi/azure-identity@1.25.3` | Azure Workload Identity / Managed Identity |
| **`azure-mgmt-securityinsight`** | `2.0.0b3` | MIT | `pkg:pypi/azure-mgmt-securityinsight@2.0.0b3` | Microsoft Sentinel REST / ARM SDK |
| **`azure-monitor-query`** | `2.0.0` | MIT | `pkg:pypi/azure-monitor-query@2.0.0` | Log Analytics KQL execution engine |
| **`openai`** | `3.3.1` | Apache-2.0 | `pkg:pypi/openai@3.3.1` | Azure OpenAI GPT-5.2 SDK |
| **`python-jose`** | `3.5.0` | MIT | `pkg:pypi/python-jose@3.5.0` | Cryptographic JWT signing & RBAC validation |
| **`cryptography`** | `50.0.0` | Apache-2.0 | `pkg:pypi/cryptography@50.0.0` | Core cryptographic primitives & HMAC |
| **`httpx`** | `0.28.1` | BSD-3-Clause | `pkg:pypi/httpx@0.28.1` | Async HTTP client for Threat Intel lookups |
| **`websockets`** | `17.0.1` | BSD-3-Clause | `pkg:pypi/websockets@17.0.1` | Real-time investigation telemetry streaming |

---

### C. SOC Workbench UI (Node.js / React)
| Package Name | Version | License | Package URL (purl) | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`react`** | `18.2.0` | MIT | `pkg:npm/react@18.2.0` | Declarative UI component engine |
| **`react-dom`** | `18.2.0` | MIT | `pkg:npm/react-dom@18.2.0` | DOM rendering layer |
| **`lucide-react`** | `0.359.0` | ISC | `pkg:npm/lucide-react@0.359.0` | Cybersecurity icon suite |
| **`axios`** | `1.6.8` | MIT | `pkg:npm/axios@1.6.8` | HTTP client with bearer interceptors |
| **`tailwindcss`** | `3.4.1` | MIT | `pkg:npm/tailwindcss@3.4.1` | Responsive CSS styling engine |
| **`vite`** | `5.1.6` | MIT | `pkg:npm/vite@5.1.6` | Optimized frontend bundler & build pipeline |

---

## 3. How to Scan the SBOM for Vulnerabilities (CVEs)

You can scan the generated [`sbom-cyclonedx.json`](file:///C:/Users/042748/.gemini/antigravity/scratch/sentinel-soc-agent/sbom-cyclonedx.json) directly using standard security tools:

### Using Grype (Anchore):
```bash
grype sbom:sbom-cyclonedx.json
```

### Using Trivy (Aqua Security):
```bash
trivy sbom sbom-cyclonedx.json
```

### Using Syft to Generate Fresh Live SBOM from Container:
```bash
syft packages sentinel-soc-agent:latest -o cyclonedx-json=live-sbom.json
```

---

## 4. CI/CD Pipeline SBOM Generation (GitHub Actions / Azure DevOps)

```yaml
- name: 🛡️ Generate CycloneDX SBOM
  uses: anchore/sbom-action@v0
  with:
    image: ${{ env.ACR_NAME }}.azurecr.io/sentinel-soc-agent:${{ github.sha }}
    format: cyclonedx-json
    output-file: ./sbom-cyclonedx.json

- name: 🔍 Scan SBOM with Grype
  uses: anchore/scan-action@v3
  with:
    sbom: ./sbom-cyclonedx.json
    fail-build: true
    severity-cutoff: high
```
