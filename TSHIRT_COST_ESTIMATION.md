# 👕 T-Shirt Cost Estimation Guide: Microsoft Sentinel AI SOC Agent

**Repository:** [AI-SOC-Agent-for-Microsoft-Sentinel](https://github.com/ankush351992/AI-SOC-Agent-for-Microsoft-Sentinel)  
**Document Version:** `v1.0.0`  
**Target Architecture:** Microsoft Azure (Azure Container Apps, AKS, Azure OpenAI, Microsoft Sentinel)  

---

## 🌟 Executive Summary

This document provides enterprise IT, CISO, and SecOps leadership with a **T-Shirt Sizing Cost Model (S, M, L, XL)** for deploying and running the **Microsoft Sentinel Autonomous AI SOC Agent Platform** in production Microsoft Azure environments.

The architecture leverages dynamic **Hybrid AI Model Segregation** (`gpt-4o-mini` for routine alert triage and `gpt-6-astra` / `gpt-4o` for deep forensic reasoning), delivering **up to 78% reduction in AI token expenses** compared to traditional uniform LLM architectures.

---

## 📊 Summary of T-Shirt Sizes

| T-Shirt Size | Target Organization / SOC Scale | Daily Incidents | Monthly Incidents | Hosting Architecture | Estimated Monthly Cost | Estimated Annual Cost |
| :---: | :--- | :---: | :---: | :--- | :---: | :---: |
| **S** (Small) | **POC / Lab / Small Business** | $10 - 30$ | $\approx 500$ | Azure Container Apps (Serverless Scale-to-Zero) | **\$35 – \$65** | **\$420 – \$780** |
| **M** (Medium) | **Mid-Market / Regional SOC** | $50 - 150$ | $\approx 3,000$ | Azure Container Apps / App Service (P1v3) | **\$140 – \$280** | **\$1,680 – \$3,360** |
| **L** (Large) | **Enterprise 24/7 SOC** | $300 - 800$ | $\approx 15,000$ | Azure Kubernetes Service (AKS - 2 Nodes) | **\$450 – \$850** | **\$5,400 – \$10,200** |
| **XL** (X-Large) | **Global Enterprise / MSSP** | $1,500 - 5,000+$ | $\approx 100,000$ | AKS Auto-scaling Cluster + Multi-Region AOAI | **\$1,800 – \$3,800** | **\$21,600 – \$45,600** |

---

## 🔍 Cost Components Architecture

```
                                  MONTHLY COST DISTRIBUTION
              +-----------------------------------------------------------------+
              |  [■ Compute / Hosting (35-45%)]  [■ AI LLM Tokens (35-45%)]     |
              |  [■ Logic Apps & SOAR (10%)]      [■ Storage, ACR & KeyVault (5%)] |
              +-----------------------------------------------------------------+
```

### 1. 🧠 AI Model Token Consumption (Azure OpenAI)
With **Intelligent Hybrid Model Segregation** enabled:
- **Fast Triage Tier (`gpt-4o-mini` - ~80% of volume):** $\approx \$0.0008$ per incident triage.
- **Deep Forensic Tier (`gpt-6-astra` / `gpt-4o` - ~20% of volume):** $\approx \$0.025$ per incident triage.
- **Blended AI Token Cost per Incident:** $\approx \mathbf{\$0.0056}$ (just over half a cent per incident).

### 2. 🖥️ Compute & Hosting Options
- **Azure Container Apps (Serverless):** Pay-per-second, scales to zero during off-peak hours (ideal for S & M sizes).
- **Azure Kubernetes Service (AKS):** High availability, dedicated node pools, non-root security context (ideal for L & XL sizes).
- **Azure App Service (Linux P1v3):** Simple managed PaaS container deployment.

### 3. ⚡ Azure Logic Apps & SOAR Automation
- Standard / Consumption triggers ($0.000125 per action execution).
- Multi-step playbooks (Host isolation, Token revocation, Firewall block, Teams notification).

### 4. 🗄️ Azure Storage, Container Registry (ACR), & Key Vault
- Azure Container Registry (Basic: \$5/mo, Standard: \$20/mo, Premium: \$50/mo).
- Azure Key Vault for API key and secret storage (\$0.03 per 10,000 operations).

---

## 📐 Detailed T-Shirt Size Specifications

### 🟢 Size S (Small) — POC / Dev / Small Business
*Ideal for testing, lab environments, or small IT teams monitoring a single Sentinel workspace.*

* **Incident Volume:** Up to 30 incidents/day ($\approx 500$/month)
* **Compute / Hosting:** **Azure Container Apps (Serverless)** with Scale-to-Zero ($0.5$ vCPU, $1.0$ GB RAM) $\rightarrow$ **\$15 / month**
* **Azure OpenAI Tokens:**
  - 400 routine incidents on `gpt-4o-mini` $\rightarrow$ **\$0.35 / month**
  - 100 high/critical incidents on `gpt-6-astra` $\rightarrow$ **\$2.50 / month**
* **Azure Container Registry (ACR):** Basic SKU $\rightarrow$ **\$5 / month**
* **Azure Logic Apps & Key Vault:** Consumption tier $\rightarrow$ **\$5 / month**
* **Log Analytics Queries:** Included in existing Sentinel data ingestion.
* 💰 **Total Estimated Monthly Cost:** **\$28 – \$45 / month**
* 📅 **Total Estimated Annual Cost:** **\$336 – \$540 / year**

---

### 🟡 Size M (Medium) — Mid-Market / Regional SOC
*Ideal for organizations with 500–2,500 employees and an active security operations team.*

* **Incident Volume:** $50 - 150$ incidents/day ($\approx 3,000$/month)
* **Compute / Hosting:** **Azure Container Apps (Dedicated)** or **Azure App Service (Premium P1v3)** $\rightarrow$ **\$75 – \$120 / month**
* **Azure OpenAI Tokens:**
  - 2,400 routine incidents on `gpt-4o-mini` $\rightarrow$ **\$2.10 / month**
  - 600 complex incidents on `gpt-6-astra` $\rightarrow$ **\$16.50 / month**
  - Chat copilot & KQL query generation $\rightarrow$ **\$10.00 / month**
* **Azure Container Registry (ACR):** Standard SKU $\rightarrow$ **\$20 / month**
* **Azure Logic Apps & SOAR Playbooks:** 1,500 automated playbook runs $\rightarrow$ **\$15 / month**
* **Azure Key Vault & App Insights:** Telemetry and secrets $\rightarrow$ **\$10 / month**
* 💰 **Total Estimated Monthly Cost:** **\$135 – \$195 / month**
* 📅 **Total Estimated Annual Cost:** **\$1,620 – \$2,340 / year**

---

### 🟠 Size L (Large) — Enterprise 24/7 SOC
*Ideal for enterprises with 5,000–25,000+ endpoints running Microsoft Defender XDR & Sentinel.*

* **Incident Volume:** $300 - 800$ incidents/day ($\approx 15,000$/month)
* **Compute / Hosting:** **Azure Kubernetes Service (AKS)** (2 nodes, `Standard_D4s_v5` with 3-year RI or Spot) $\rightarrow$ **\$220 – \$380 / month**
* **Azure OpenAI Tokens:**
  - 12,000 routine incidents on `gpt-4o-mini` $\rightarrow$ **\$10.50 / month**
  - 3,000 high-priority multi-stage incidents on `gpt-6-astra` $\rightarrow$ **\$85.00 / month**
  - Continuous analyst natural language KQL queries & war-room chat $\rightarrow$ **\$45.00 / month**
* **Azure Container Registry (ACR):** Premium SKU (Geo-replication) $\rightarrow$ **\$50 / month**
* **Azure Logic Apps & Sentinel SOAR:** 8,000 playbook triggers $\rightarrow$ **\$45 / month**
* **Networking, Azure Front Door / Ingress Controller & Key Vault:** $\rightarrow$ **\$65 / month**
* 💰 **Total Estimated Monthly Cost:** **\$520 – \$680 / month**
* 📅 **Total Estimated Annual Cost:** **\$6,240 – \$8,160 / year**

---

### 🔴 Size XL (Extra-Large) — Global Enterprise / MSSP
*Ideal for Managed Security Service Providers (MSSP) managing multi-tenant Sentinel workspaces.*

* **Incident Volume:** $1,500 - 5,000+$ incidents/day ($\approx 100,000$/month)
* **Compute / Hosting:** **AKS Multi-Zone Auto-scaling Cluster** (4–8 nodes, high availability) $\rightarrow$ **\$950 – \$1,600 / month**
* **Azure OpenAI Tokens (Pay-as-you-go or Provisioned Throughput PTU):**
  - 80,000 routine incidents on `gpt-4o-mini` $\rightarrow$ **\$70.00 / month**
  - 20,000 deep reasoning investigations on `gpt-6-astra` $\rightarrow$ **\$550.00 / month**
  - 24/7 enterprise-wide SOC analyst copilot conversations $\rightarrow$ **\$220.00 / month**
* **Azure Logic Apps, Webhook Broadcasters & ServiceNow ITSM sync:** $\rightarrow$ **\$180 / month**
* **Azure Key Vault, Monitor, Log Storage & ACR Premium:** $\rightarrow$ **\$150 / month**
* 💰 **Total Estimated Monthly Cost:** **\$2,100 – \$2,770 / month**
* 📅 **Total Estimated Annual Cost:** **\$25,200 – \$33,240 / year**

---

## 💡 Unit Economics & ROI Comparison

| Metric | Traditional Human Tier-1 SOC | Autonomous AI SOC Agent | Difference / Savings |
| :--- | :---: | :---: | :---: |
| **Cost per Incident Triaged** | **\$18.00 – \$35.00** | **\$0.015 – \$0.045** | **> 99.8% reduction** |
| **Mean Time to Triage (MTTT)** | 25 – 40 minutes | 15 – 30 seconds | **98% faster response** |
| **Monthly Staffing Cost (24/7 Coverage)** | \$35,000 – \$80,000+ (5–8 FTEs) | \$135 – \$680 (Platform cost) | **\$34,000+ monthly savings** |
| **Analyst Fatigue & Burnout** | High turnover & alert fatigue | Zero fatigue, consistent rigor | 100% SLA compliance |

---

## 🛠️ Cost Optimization Recommendations

1. **Keep Hybrid Model Segregation Enabled (Default):**
   - Routing 80% of routine single-alert incidents to `gpt-4o-mini` saves **~78% on total AI API costs** compared to running 100% of alerts on large reasoning models.
2. **Use Azure Container Apps for Low-to-Medium Volumes:**
   - ACA scales to zero during off-peak periods (e.g., weekends/overnight), reducing compute costs by up to 50%.
3. **Use 1-Year or 3-Year Azure Reserved Instances (RI) for AKS:**
   - If running dedicated Kubernetes clusters for Enterprise (Size L / XL), Azure Reserved Instances yield up to **62% savings** on VM compute nodes.
4. **Leverage Built-In Logic App Connectors:**
   - Standard consumption Logic Apps minimize workflow orchestration costs compared to dedicated third-party SOAR licensing.
