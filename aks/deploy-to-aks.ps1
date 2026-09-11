# ==============================================================================
# Microsoft Sentinel AI SOC Agent - Automated Deployment Script for AKS
# Autonomous AI Incident Triage Platform for Microsoft Sentinel & Defender XDR
# ==============================================================================

param (
    [string]$SubscriptionId = "YOUR_AZURE_SUBSCRIPTION_ID",
    [string]$ResourceGroup  = "rg-sentinel-soc",
    [string]$AksClusterName = "aks-sentinel-soc",
    [string]$AcrName        = "sentinelsocregistry",
    [string]$Location       = "eastus"
)

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "🚀 Deploying Microsoft Sentinel AI SOC Platform to AKS" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Select Azure Subscription
Write-Host "🔹 Setting Azure Subscription: $SubscriptionId..." -ForegroundColor Yellow
az account set --subscription $SubscriptionId

# 2. Check / Create Azure Container Registry (ACR)
Write-Host "🔹 Checking Azure Container Registry ($AcrName)..." -ForegroundColor Yellow
$acrExists = az acr show --name $AcrName --resource-group $ResourceGroup --query "id" -o tsv 2>$null
if (-not $acrExists) {
    Write-Host "📦 Creating Azure Container Registry: $AcrName..." -ForegroundColor Green
    az acr create --resource-group $ResourceGroup --name $AcrName --sku Premium --location $Location
}

# 3. Build Container in Azure ACR Cloud (Zero Docker Daemon required locally)
Write-Host "`n🔹 Building Container Image in ACR (Multi-stage React + Python)..." -ForegroundColor Yellow
az acr build --registry $AcrName --image "sentinel-soc-agent:latest" ..

# 4. Check / Create AKS Cluster
Write-Host "`n🔹 Checking AKS Cluster ($AksClusterName)..." -ForegroundColor Yellow
$aksExists = az aks show --name $AksClusterName --resource-group $ResourceGroup --query "id" -o tsv 2>$null
if (-not $aksExists) {
    Write-Host "☸️ Creating Production AKS Cluster ($AksClusterName)..." -ForegroundColor Green
    az aks create `
        --resource-group $ResourceGroup `
        --name $AksClusterName `
        --node-count 2 `
        --node-vm-size Standard_D4s_v5 `
        --enable-managed-identity `
        --attach-acr $AcrName `
        --generate-ssh-keys `
        --location $Location
} else {
    Write-Host "🔗 Ensuring ACR ($AcrName) is attached to AKS ($AksClusterName)..." -ForegroundColor Yellow
    az aks update --name $AksClusterName --resource-group $ResourceGroup --attach-acr $AcrName --output none
}

# 5. Get AKS Credentials (Kubeconfig)
Write-Host "`n🔹 Fetching AKS Cluster Credentials..." -ForegroundColor Yellow
az aks get-credentials --resource-group $ResourceGroup --name $AksClusterName --overwrite-existing

# 6. Apply Kubernetes Manifests
Write-Host "`n🔹 Updating Deployment Image URI..." -ForegroundColor Yellow
$loginServer = az acr show --name $AcrName --query "loginServer" -o tsv
(Get-Content deployment.yaml) -replace "YOUR_ACR_NAME\.azurecr\.io", $loginServer | Set-Content deployment.yaml

Write-Host "🔹 Applying Kubernetes Manifests via Kustomize..." -ForegroundColor Yellow
kubectl apply -k .

# 7. Wait for Rollout
Write-Host "`n⏳ Waiting for Sentinel SOC Agent rollout to complete..." -ForegroundColor Yellow
kubectl rollout status deployment/sentinel-soc-agent -n sentinel-soc --timeout=180s

# 8. Get Public Service IP
Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "✅ Deployment Successfully Completed!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green

Write-Host "📡 Fetching Public Service IP / Ingress..." -ForegroundColor Cyan
kubectl get svc -n sentinel-soc

Write-Host "`n🎉 Access your Sentinel SOC Agent via the External-IP listed above!" -ForegroundColor Green
