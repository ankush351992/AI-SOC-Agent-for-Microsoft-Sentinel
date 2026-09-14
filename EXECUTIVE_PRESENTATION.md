# 🛡️ Sentinel AI SOC - Autonomous Incident Triage Platform
## Technical Architecture & Executive Demonstration Guide

**Project:** Sentinel AI SOC - Autonomous Incident Triage Platform  
**Target Audience:** SOC Manager, Head of Cybersecurity, Engineering Leadership  
**Presenter:** Security Operations Lead / AI Systems Engineer  

---

## 🎯 Executive Summary (The 30-Second Elevator Pitch)

> *"Modern SOC teams are overwhelmed by hundreds of security alerts daily, spending 20 to 30 minutes manually querying Log Analytics and correlating threat intelligence for each incident. **Sentinel AI SOC** is an autonomous Tier-1/Tier-2 AI triage agent that reduces Mean Time to Triage (MTTR) from **25 minutes to under 30 seconds**. It correlates multi-source threat intelligence, synthesizes entity baselines via KQL, generates MITRE ATT&CK verdicts, and produces executive-ready investigation reports directly inside a secure enterprise portal."*

---

## 📊 Presentation Slide Deck Outline

### Slide 1: The Challenge in Our SOC Today
* **Alert Fatigue:** SOC analysts triage 50–150+ Microsoft Sentinel alerts per shift, 60–70% of which turn out to be benign False Positives (scanners, scheduled admin jobs).
* **High MTTR (Mean Time to Respond):** Manually writing KQL queries, checking VirusTotal/AbuseIPDB, and drafting incident notes takes 20–30 minutes per incident.
* **Knowledge Barrier:** Junior Tier-1 analysts struggle with complex Kusto Query Language (KQL) syntax for deep behavioral hunting.

---

### Slide 2: Introducing Sentinel AI SOC Agent
* **Autonomous ReAct AI Agent:** Directly connects to Microsoft Sentinel and Log Analytics to extract entities (Users, IPs, Hosts, Hashes) and orchestrate investigations.
* **Tri-Feed Threat Intelligence:** Correlates IOCs across **Microsoft Defender Threat Intelligence (MDTI)**, **Sentinel STIX/TAXII feeds**, **AbuseIPDB**, and **VirusTotal**.
* **AI KQL Generator & Live Runner:** Translates plain English into production-ready KQL hunting queries and executes them live within the portal.
* **In-Portal Report Editor & Export:** Analysts can review, edit, and export high-resolution PDF investigation reports in 1 click.

---

### Slide 3: Enterprise Architecture & Security
```
                     +--------------------------------------------------+
                     |         Sentinel AI SOC Web Console              |
                     |  (React 18, Dark/Light Theme, High-Tech Portal)  |
                     +------------------------+-------------------------+
                                              | REST / WebSocket
                                              v
                     +--------------------------------------------------+
                     |         FastAPI Async Agent Core                 |
                     |   (JWT RBAC, KQL Runner, AI Reasoning Engine)    |
                     +-------+----------------+----------------+--------+
                             |                |                |
            +----------------+                |                +----------------+
            v                                 v                                 v
+-----------------------+         +-----------------------+         +-----------------------+
|  Microsoft Sentinel   |         |  Azure Log Analytics  |         |   Threat Intel Feeds  |
|  & Defender XDR       |         |  (Live KQL Queries)   |         |  (MDTI, AbuseIPDB, VT)|
+-----------------------+         +-----------------------+         +-----------------------+
```
* **Deployment Model:** Containerized multi-stage Docker image hosted on **Azure Kubernetes Service (AKS)** or **Azure Container Apps (ACA)**.
* **Zero-Secret Security:** Uses **Azure Workload Identity / Managed Identity** (no hardcoded credentials).
* **Role-Based Access Control (RBAC):** SOC Admins manage infrastructure; SOC Analysts have protected read & diagnostic test access.
* **Compliance:** Fully compliant with **CycloneDX v1.5 SBOM** standards with 0 known high/critical CVEs.

---

### Slide 4: Measurable Business ROI

| Metric | Traditional Manual Triage | With Sentinel AI SOC Agent | Business Impact |
| :--- | :---: | :---: | :--- |
| **Mean Time to Triage (MTTR)** | **25 – 35 Mins** | **< 30 Seconds** | **95% Faster Incident Assessment** |
| **False Positive Elimination** | Manual Analyst Review | Autonomous Auto-Close (>90% Conf.) | **60% Reduction in Alert Fatigue** |
| **KQL Query Drafting Time** | 5 – 10 Mins per query | Instant Natural Language | **Upskills Tier-1/Tier-2 Analysts** |
| **Investigation Reporting** | Manual copy-pasting | 1-Click Forensic PDF Report | **Standardized Executive Auditing** |

---

## 🎬 5-Minute Live Demonstration Script (Step-by-Step)

### Minute 1: The Incident Workbench & Real-Time Queue
1. Open the console at **`http://localhost:3000`** and log in as `soc_admin` or `analyst`.
2. Point out the clean Dark/Light theme toggle, and top metric cards (*Active Incidents, Triaged Today, False Positive Rate*).
3. **What to Say:**
   > *"Here is our real-time Incident Workbench. It pulls live incidents from Microsoft Sentinel with time-range filtering from Last 24 Hours to All Time. Let's look at Incident #1042: 'Suspicious Encoded PowerShell Execution'."*

---

### Minute 2: Running Autonomous AI Triage
1. Click **"Run AI Triage"** on the selected incident.
2. Watch the **Agent Execution Trace** stream live investigation events via WebSocket.
3. **What to Say:**
   > *"Notice how the AI agent automatically breaks down the investigation: Step 1 extracts all entities. Step 2 queries Microsoft Defender TI and AbuseIPDB. Step 3 executes KQL queries against Log Analytics to inspect process lineage. Step 4 synthesizes evidence to formulate a True Positive verdict mapped to MITRE ATT&CK."*

---

### Minute 3: In-Portal Report Editing & PDF Export
1. Switch to the **AI Triage Report** tab.
2. Click **"Edit Report"** to show how an analyst can tweak the executive summary or add notes.
3. Click **"Export PDF"** to generate the clean, printable forensic investigation report.
4. **What to Say:**
   > *"The agent generates a complete executive summary, evidence timeline, and containment recommendations. Analysts have the flexibility to edit findings directly in the portal and export a styled PDF report for executive stakeholders or compliance audits."*

---

### Minute 4: The AI KQL Generator & Live Portal Execution
1. Switch to the **KQL Generator** tab.
2. Click the quick template: **`7-Day Sign-in Baseline`** or **`Malicious Process Lineage`**.
3. Point out the generated KQL query, then click the green **`▶ Run in Portal`** button.
4. Show the live results modal displaying real rows, latency, and returned telemetry.
5. **What to Say:**
   > *"Instead of writing complex Kusto queries from scratch, any analyst can ask the KQL Generator in plain English. With one click on 'Run in Portal', the query executes directly against our Log Analytics workspace, returning live table telemetry in milliseconds."*

---

### Minute 5: Enterprise Governance & Next Steps
1. Navigate to **Azure & Agent Settings**.
2. Show the active Microsoft Sentinel workspace coordinates, Azure OpenAI `gpt-5.2` latency stats, and RBAC user roles.
3. **What to Say:**
   > *"Everything is enterprise-ready, containerized for AKS, and ready for continuous incident monitoring."*
