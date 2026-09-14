# 🚀 Microsoft Azure Deployment Guide
**Application:** Sentinel AI SOC - Autonomous Incident Triage Agent  
**Target Environments:** Azure Kubernetes Service (AKS) or Azure Container Apps (ACA)  
**Container Architecture:** Multi-stage build (React Frontend + FastAPI Async Backend in non-root container)

---

## 🌟 Quick Start: 1-Click Automated Script

You can deploy the entire application to Azure using the automated scripts (no local Docker required — builds directly in Azure Container Registry):

### In PowerShell (Windows):
```powershell
# Deploy to Azure Kubernetes Service (AKS)
.\deploy-to-azure.ps1 -ResourceGroup "rg-sentinel-soc-prod" -Location "eastus" -DeploymentTarget "aks"

# Or Deploy to Azure Container Apps (Serverless)
.\deploy-to-azure.ps1 -ResourceGroup "rg-sentinel-soc-prod" -Location "eastus" -DeploymentTarget "containerapp"
```

### In Bash / Azure Cloud Shell:
```bash
chmod +x deploy-to-azure.sh
./deploy-to-azure.sh "rg-sentinel-soc-prod" "eastus" "myacr$RANDOM" "aks-sentinel-soc" "aks"
```

---

## 🛠️ Step-by-Step Manual Deployment

### Step 1: Create Azure Resource Group & Container Registry (ACR)
```bash
# Set variables
RESOURCE_GROUP="rg-sentinel-soc-prod"
LOCATION="eastus"
ACR_NAME="acrsentinelsoc$RANDOM"

# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create ACR
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true
```

---

### Step 2: Build the Container Image in Azure Cloud
```bash
# ACR Cloud Build (packages React + FastAPI into a single image)
az acr build --registry $ACR_NAME --image sentinel-soc-agent:latest .
```

---

### Step 3: Deploy to Azure Kubernetes Service (AKS)

1. **Create AKS Cluster with Workload Identity:**
   ```bash
   az aks create \
     --resource-group $RESOURCE_GROUP \
     --name aks-sentinel-soc \
     --node-count 2 \
     --enable-oidc-issuer \
     --enable-workload-identity \
     --attach-acr $ACR_NAME \
     --generate-ssh-keys
   ```

2. **Connect `kubectl` to AKS:**
   ```bash
   az aks get-credentials --resource-group $RESOURCE_GROUP --name aks-sentinel-soc --overwrite-existing
   ```

3. **Update Image & Apply Manifests:**
   ```bash
   # Replace ACR name in deployment.yaml
   sed -i "s/your-acr.azurecr.io/$ACR_NAME.azurecr.io/g" ./k8s/deployment.yaml

   # Apply manifests
   kubectl apply -f ./k8s/namespace.yaml
   kubectl apply -f ./k8s/configmap.yaml
   kubectl apply -f ./k8s/secret.yaml
   kubectl apply -f ./k8s/workload-identity.yaml
   kubectl apply -f ./k8s/deployment.yaml
   kubectl apply -f ./k8s/service.yaml
   ```

4. **Retrieve Public LoadBalancer IP:**
   ```bash
   kubectl get svc -n sentinel-soc
   ```
   Open `http://<EXTERNAL-IP>` in your browser!

---

### Step 4: Alternative Serverless Deployment (Azure Container Apps)

If you do not want to manage Kubernetes nodes:
```bash
# 1. Create Container App Environment
az containerapp env create --name "env-sentinel-soc" --resource-group $RESOURCE_GROUP --location $LOCATION

# 2. Deploy Container App
ACR_PASS=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

az containerapp create \
  --name "sentinel-soc-agent" \
  --resource-group $RESOURCE_GROUP \
  --environment "env-sentinel-soc" \
  --image "$ACR_NAME.azurecr.io/sentinel-soc-agent:latest" \
  --target-port 8000 \
  --ingress external \
  --registry-server "$ACR_NAME.azurecr.io" \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASS \
  --cpu 1.0 --memory 2.0Gi

# 3. Get Public FQDN URL
az containerapp show --name "sentinel-soc-agent" --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv
```

---

## 🔒 Post-Deployment Checklist

1. Log into your deployed web console using **`soc_admin`** / **`SentinelAdmin2026!`**.
2. Go to **`Azure & Agent Settings`** and configure your Sentinel Subscription and Log Analytics Workspace coordinates.
3. Uncheck *"Sandbox / Demo Simulation Mode"* and run the **Diagnostics Self-Test** to confirm live synchronization!
