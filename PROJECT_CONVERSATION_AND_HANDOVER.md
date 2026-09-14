# 📋 Microsoft Sentinel AI SOC Agent - Complete Session History & Handover Document

**Project:** Autonomous AI SOC Triage & Copilot for Microsoft Sentinel  
**Author / Maintainer:** Ankush Chouhan ([https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel](https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel))  
**Date:** September 2026  
**GitHub Repository:** [https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel](https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel)  
**Branches:**
* `main` / `sentinel-soc-agent` (Full repository with `.env`)
* `TriagingAgent---Clean` (Sanitized clean branch for public / team sharing)

---

## 1. Executive Summary & Session Achievements

During this session, we built, refined, tested, and containerized an enterprise-grade **Autonomous AI SOC Incident Triage Platform** integrated with **Microsoft Sentinel**, **Azure Log Analytics**, and **Azure OpenAI `gpt-5.2`**.

### Key Milestones Completed:
1. **Azure OpenAI Integration**: Connected to Azure OpenAI (`gpt-4o` / `gpt-5.2`) for high-speed multi-agent triage and synthesis.
2. **Entra ID SOC Engineer Assignment**: Added direct directory fetching and assignment of Microsoft Entra ID engineers to Sentinel incidents.
3. **KQL Generator & Studio**: Fixed Lucide icon rendering and established natural language to Kusto Query Language synthesis with live 1-click execution against Log Analytics workspaces.
4. **ARM Incident Status Management & Mandatory Classification**:
   - Fixed Azure Resource Manager (ARM) status transitions (`New` $\leftrightarrow$ `Active` $\leftrightarrow$ `Closed`).
   - Implemented mandatory Close & Classify modal with dynamic reasons (`TruePositive`, `FalsePositive`, `BenignPositive`, `Undetermined`) and automatic Sentinel audit comments.
5. **System Design & Architecture**: Created comprehensive high-level and sequence Mermaid architecture diagrams.
6. **Software Bill of Materials (SBOM)**: Generated CycloneDX v1.5 JSON (`sbom-cyclonedx.json`) and ran live vulnerability scans with Anchore Grype and `pip-audit`.
7. **Production AKS Deployment**: Built production Kubernetes manifests in `aks/` (`namespace.yaml`, `deployment.yaml`, `service.yaml`, `secret.yaml`, `ingress.yaml`, and 1-click PowerShell/Bash deployment scripts).
8. **Git & GitHub Migration**: Initialized Git repository and pushed clean open-source releases to GitHub.

---

## 2. Microsoft Cloud Configuration Template

* **Subscription ID:** `YOUR_AZURE_SUBSCRIPTION_ID`
* **Resource Group:** `YOUR_RESOURCE_GROUP`
* **Workspace Name:** `YOUR_WORKSPACE_NAME`
* **Workspace ID (GUID / customerId):** `YOUR_LOG_ANALYTICS_WORKSPACE_GUID`
* **Tenant ID:** `YOUR_AZURE_TENANT_ID`
* **Client ID:** `YOUR_AZURE_CLIENT_ID`
* **Azure OpenAI Endpoint:** `https://YOUR_AOAI_RESOURCE.openai.azure.com/`
* **Azure OpenAI Model Deployment:** `gpt-5.2` (or `gpt-4o`)

---

## 3. Architecture & Agent Inventory

The application consists of 5 autonomous AI and execution engines:

1. **`SentinelTriageAgent` (Autonomous Triage)**:
   * Extracts entities (IPs, accounts, hashes, hosts).
   * Enriches indicators via threat intel (AbuseIPDB, VirusTotal, MDTI).
   * Runs baseline KQL queries against Log Analytics.
   * Performs Root Cause Analysis (RCA) and maps to MITRE ATT&CK.
   * Auto-syncs structured triage report as a Markdown comment to Microsoft Sentinel.
2. **Interactive Incident Copilot**: Real-time conversational investigator for incident deep-dives.
3. **AI KQL Hunting Generator**: Synthesizes and executes live KQL queries from plain English prompts.
4. **Automated SOC Remediation Engine**: 1-click Entra ID account disabling, session revocation, IP blocking, and host isolation.
5. **Threat Intelligence Correlation Engine**: Multi-source IOC scoring.

---

## 4. Instant 3-Minute Setup Guide (macOS & Windows)

### 🍏 On macOS (New MacBook / Mac Studio):
```bash
# 1. Clone the repository from GitHub
git clone https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel.git
cd sentinel-soc-agent

# 2. Install prerequisites using Homebrew (if needed)
brew install python@3.11 node

# 3. Setup & Start Backend (Terminal 1)
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # Populate your Azure & OpenAI keys
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 4. In a New Terminal Tab: Setup & Start Frontend (Terminal 2)
cd ../frontend
npm install
npm run dev
```

### 🪟 On Windows (PowerShell / Windows Terminal):
```powershell
# 1. Clone the repository from GitHub
git clone https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel.git
cd sentinel-soc-agent

# 2. Setup & Start Backend (PowerShell Window 1)
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env    # Populate your Azure & OpenAI keys
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 3. In a Second PowerShell Window: Setup & Start Frontend (PowerShell Window 2)
cd sentinel-soc-agent\frontend
npm install
npm run dev
```

* **Web Portal:** `http://localhost:3000`
* **API Docs:** `http://127.0.0.1:8000/docs`
* **Admin Login:** `soc_admin` / `SentinelAdmin2026!`

---

## 5. Token & Cost Summary

* **Autonomous Triage:** ~1,800 – 2,500 tokens per incident (~$0.015 / triage).
* **KQL Generation:** ~500 – 850 tokens per query (~$0.003 / query).
* **Incident Chat:** ~600 – 1,150 tokens per turn (~$0.005 / turn).
* **Estimated Monthly Cost (3,500 incidents/month):** ~$45 – $75 / month on Azure OpenAI `gpt-5.2`.

---

## 6. Raw Conversation Transcript Files on this Machine

The raw JSONL transcript logs for this entire conversation are stored locally at:
* **Token-Efficient Log:** `C:\Users\042748\.gemini\antigravity\brain\05628d47-5390-4719-a47f-95b6e1360666\.system_generated\logs\transcript.jsonl`
* **Full Untruncated Log:** `C:\Users\042748\.gemini\antigravity\brain\05628d47-5390-4719-a47f-95b6e1360666\.system_generated\logs\transcript_full.jsonl`
