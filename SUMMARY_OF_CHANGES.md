# 📋 Summary of Changes - Microsoft Sentinel AI SOC Agent

**Repository:** [AI-SOC-Agent-for-Microsoft-Sentinel](https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel)  
**Release Version:** `v1.2.0`  
**Date:** September 17, 2026  
**Author:** Ankush Chouhan  
**Target Environment:** Microsoft Sentinel • Microsoft Defender XDR • Azure Entra ID  

---

## 🌟 Executive Summary

This release introduces major enterprise capabilities to the **Microsoft Sentinel Autonomous AI SOC Agent Platform**, focusing on:
1. **Interactive SOAR Automation:** Full Azure Logic Apps discovery and multi-category playbook triggering with real-time incident audit trails.
2. **Cost & Latency Optimization:** Dynamic **Hybrid AI Model Segregation** (`gpt-4o-mini` for routine alerts, `gpt-6-astra` for deep forensic reasoning).
3. **Zero-Trust Security:** Ephemeral startup passwords with mandatory first-login password resets across all SOC roles.
4. **Service Principal Transparency:** Complete Azure RBAC & Microsoft Graph API permissions matrix with a 1-click automated Azure CLI setup script.
5. **Full Executive Briefing Suite:** Automated publication-ready report generation in PDF, Word (`.docx`), Markdown, and JSON.

---

## 🚀 Detailed Summary of Changes by Feature

### 1. ⚡ Interactive Azure Logic Apps & SOAR Playbook Selector
- **Problem Solved:** Previously, clicking remediation actions ran a blind, hardcoded containment routine without analyst choice or category filtering.
- **New Capabilities:**
  - Clicking **"Run Playbook"** opens an interactive **Azure Logic Apps Selector Modal**.
  - Live querying of Azure Resource Manager REST API (`Microsoft.Logic/workflows`) merged with an 8-playbook Enterprise SOAR catalog:
    - `SOAR-Isolate-Endpoint-LogicApp` (Device network isolation via Defender for Endpoint)
    - `SOAR-Revoke-User-Sessions-LogicApp` (Invalidate Entra ID tokens & active sign-in sessions)
    - `SOAR-Block-Malicious-IP-LogicApp` (Azure Firewall / NSG perimeter IP drop rule)
    - `SOAR-Disable-Compromised-Account-LogicApp` (Disable user object in Microsoft Entra ID)
    - `SOAR-Post-Incident-Teams-Slack-LogicApp` (Interactive triage card broadcast to `#soc-war-room`)
    - `SOAR-Create-ServiceNow-P1-Ticket-LogicApp` (Bidirectional ServiceNow incident sync)
    - `SOAR-Full-Incident-Containment-Playbook` (Multi-stage full incident containment)
    - `SOAR-Trigger-Defender-Antivirus-Scan-LogicApp` (On-demand Defender Antivirus scan)
  - **Live Search & Category Filtering:** Instant filtering across `All`, `Containment`, `Identity`, `Network`, `Notification`, `Ticketing`, and `Forensics`.
  - **Target Entity Badges:** Displays contextual Accounts, Hostnames, and IP addresses passed into the Logic App payload.
  - **Custom Execution Notes:** Analysts can record containment rationale attached directly to the audit log.
  - **Real-Time Audit Trail:** Generates unique `run_id`, posts structured audit comments (`⚡ Sentinel SOAR Playbook Execution`), and applies `Playbook:<Name>` and `SOAR-Automated` labels to the Sentinel incident.

---

### 2. 🧠 Intelligent Hybrid Model Segregation (`gpt-4o-mini` & `gpt-6-astra`)
- **Problem Solved:** Routing 100% of alerts to large reasoning models creates high API costs and latency; routing all alerts to small models degrades deep forensic root-cause analysis on APT attacks.
- **New Architecture:**
  - **Fast Triage Tier (`gpt-4o-mini`):** Handles ~80% of routine, single-alert, low/medium severity incidents with sub-second response times and minimal token costs.
  - **Deep Forensic Tier (`gpt-6-astra`):** Automatically activated for ~20% of incidents meeting escalation heuristics:
    - High or Critical incident severity.
    - Correlated multi-alert attack campaigns ($\ge 2$ alerts).
    - Multi-stage MITRE ATT&CK lifecycle ($\ge 2$ distinct tactics).
    - Complex threat vectors & APT indicators (`powershell`, `tor`, `ransomware`, `c2`, `mimikatz`, `service principal`, `exfiltration`, `lateral movement`).
  - **Stream & Report Stamping:** Live `MODEL_SELECTED` badge emitted to WebSocket stream; AI model and reasoning tier prominently stamped in all PDF, DOCX, and Markdown executive briefings.
  - **Portal Settings Management:** Portal radio cards allow switching between `Hybrid`, `Always Mini`, or `Always Astra` modes with runtime `.env` persistence.

---

### 3. 🔒 First-Run Ephemeral Credentials & Security Hardening
- **Problem Solved:** Eliminated risk of hardcoded default credentials in public repositories and production deployments.
- **New Capabilities:**
  - On application startup, all accounts (`soc_admin`, `analyst`, `tier1_analyst`) receive cryptographically randomized passwords generated via `secrets.token_urlsafe(12)`.
  - Credentials are displayed once in the backend console during boot for initialization.
  - Mandatory first-login password reset workflow blocks access until a strong password ($\ge 8$ chars, mixed alphanumeric/special) is configured.
  - Tokens issued prior to password change are restricted from protected SOC endpoints.

---

### 4. 👥 Live Microsoft Entra ID Directory Assignment
- **New Capabilities:**
  - Assign incidents directly to SOC engineers and analysts queried in real-time from your live Microsoft Entra ID (Azure AD) tenant.
  - Seamless fallback hierarchy: Microsoft Graph API $\rightarrow$ Sentinel Log Analytics `SigninLogs` directory telemetry $\rightarrow$ Default SOC directory roster.
  - Assignment changes automatically update the Sentinel ARM incident `owner` object and post an audit comment.

---

### 5. 🏷️ NIST-Compliant Mandatory Closing & Classification Modal
- **New Capabilities:**
  - Intercepts incident closing actions with a mandatory classification dialog.
  - Supports NIST/SOC classification standards:
    - `TruePositive` (Reason: `SuspiciousActivity`)
    - `FalsePositive` (Reason: `InaccurateData` or `IncorrectAlertLogic`)
    - `BenignPositive` (Reason: `SuspiciousButExpected`)
    - `Undetermined`
  - Closing notes and classification metadata are synced directly to Microsoft Sentinel incident properties and comment history.

---

### 6. 🔐 Complete Azure Service Principal & RBAC Permissions Matrix
- **Documented Requirements:**
  - **Azure RBAC Roles:**
    - `Microsoft Sentinel Responder` (or `Microsoft Sentinel Contributor`) on Resource Group.
    - `Log Analytics Reader` on Resource Group / Workspace.
    - `Logic App Contributor` on Resource Group / Workflows.
  - **Microsoft Graph API Permissions:**
    - `User.Read.All` (Application + Admin Consent) - Query SOC engineers for assignment.
    - `User.ReadWrite.All` (Application + Admin Consent) - Invalidate user sessions and disable compromised accounts.
  - **1-Click Azure CLI Setup Script:** Pre-configured script in `README.md` to automate App Registration, RBAC role assignment, and Microsoft Graph admin consent in seconds.

---

## 🛠️ Codebase Modifications by Component

| File | Component | Description of Changes |
| :--- | :--- | :--- |
| **`backend/app/services/sentinel_client.py`** | Backend Client | Added `DEFAULT_PLAYBOOKS` catalog, `get_playbooks()`, `trigger_playbook()`, `get_entra_users()`, `assign_incident()`, and fixed tag formatting. |
| **`backend/app/services/remediation_service.py`** | SOAR Engine | Added `trigger_playbook` handler returning run IDs, execution messages, and applied tags. |
| **`backend/app/agent/triage_agent.py`** | ReAct Agent | Implemented `select_triage_model()` heuristic router, `MODEL_SELECTED` event emission, and dynamic model routing in chat & RCA synthesis. |
| **`backend/app/api/incidents.py`** | API Layer | Added `GET /playbooks`, `GET /users/entra`, `POST /{id}/remediate`, `PATCH /{id}/assign`, and optimized route matching order. |
| **`backend/app/api/settings.py`** | Settings API | Added support for model routing mode persistence (`hybrid`, `always_mini`, `always_astra`). |
| **`backend/app/config.py`** | Config Layer | Added `LLM_ROUTING_MODE`, `FAST_MODEL_NAME`, and `REASONING_MODEL_NAME` configuration settings. |
| **`backend/app/auth/jwt_handler.py`** | Auth Engine | Implemented ephemeral password generator and mandatory first-login password reset handler. |
| **`frontend/src/components/IncidentDetail.jsx`** | UI Component | Integrated interactive Azure Logic Apps Selector Modal, Mandatory Close Modal, Entra ID Assignee Selector, and Fallback Playbooks catalog. |
| **`frontend/src/components/LiveInvestigationStream.jsx`** | UI Stream | Added visual `MODEL_SELECTED` badge with tier pill (`gpt-4o-mini` / `gpt-6-astra`). |
| **`frontend/src/components/TriageReportView.jsx`** | UI Report | Rendered dynamic AI Triage Model badge on executive summary and report exports. |
| **`frontend/src/pages/SettingsPage.jsx`** | UI Settings | Added interactive Model Segregation Strategy selector cards. |
| **`frontend/src/services/api.js`** | API Client | Added `getPlaybooks()`, `getEntraUsers()`, `assignIncident()`, and `resetPassword()`. |
| **`backend/tests/`** | Unit Tests | Added comprehensive unit tests for model selection (`test_agent.py`), playbooks (`test_sentinel.py`), and auth (`test_auth.py`). |
| **`README.md`** | Documentation | Complete overhaul with Badges, Release Notes, Permissions Matrix, Azure CLI Script, Quickstarts, and SBOM Compliance. |

---

## 🧪 Verification & Quality Assurance

- **Unit Test Suite:** All 15 unit tests pass cleanly:
  ```bash
  PYTHONPATH=backend ./backend/venv/bin/pytest backend/tests/ -v
  # 15 passed, 2 warnings in 4.80s
  ```
- **Security Vulnerability Scan:** 0 CVEs detected via Grype container vulnerability scan.
- **Frontend Build:** Vite HMR and production bundle build cleanly with zero compilation errors.
