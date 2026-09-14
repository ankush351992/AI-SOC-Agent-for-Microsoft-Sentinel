# ==============================================================================
# 🚀 Sentinel AI SOC Agent - Automated Azure Deployment Script (PowerShell)
# Target: Azure Kubernetes Service (AKS) or Azure Container Apps (ACA)
# ==============================================================================

param (
    [Parameter(Mandatory=$false)][string]$ResourceGroup = "rg-sentinel-soc-prod",
    [Parameter(Mandatory=$false)][string]$Location = "eastus",
    [Parameter(Mandatory=$false)][string]$AcrName = "acrsentinelsoc$((Get-Random -Minimum 1000 -Maximum 9999))",
    [Parameter(Mandatory=$false)][string]$AksClusterName = "aks-sentinel-soc",
    [Parameter(Mandatory=$false)][string]$DeploymentTarget = "aks" # "aks" or "containerapp"
)

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "🛡️ Deploying Sentinel AI SOC Agent to Microsoft Azure" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Check Azure CLI Login
$account = az account show --output json | ConvertFrom-Json
if (-not $account) {
    Write-Host "❌ Please run 'az login' first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Azure Context: Subscription '$($account.name)' ($($account.id))" -ForegroundColor Green

# 2. Create Resource Group if not exists
Write-Host "📦 Ensuring Resource Group '$ResourceGroup' exists in '$Location'..." -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location --output none

# 3. Create Azure Container Registry (ACR)
Write-Host "📦 Creating Azure Container Registry '$AcrName'..." -ForegroundColor Yellow
az acr create --resource-group $ResourceGroup --name $AcrName --sku Basic --admin-enabled true --output none

# 4. Build and Push Container Image to ACR using Azure Cloud Build (no local Docker required)
Write-Host "🔨 Building and pushing container image via ACR Cloud Build..." -ForegroundColor Yellow
az acr build --registry $AcrName --image sentinel-soc-agent:latest .

$acrLoginServer = "$AcrName.azurecr.io"
Write-Host "✅ Container Image built: $acrLoginServer/sentinel-soc-agent:latest" -ForegroundColor Green

if ($DeploymentTarget -eq "containerapp") {
    # -------------------------------------------------------------
    # OPTION A: Deploy to Azure Container Apps (Serverless)
    # -------------------------------------------------------------
    Write-Host "🚀 Deploying to Azure Container Apps (ACA)..." -ForegroundColor Yellow
    
    $acrPassword = az acr credential show --name $AcrName --query "passwords[0].value" -o tsv

    az containerapp env create --name "env-sentinel-soc" --resource-group $ResourceGroup --location $Location --output none
    
    az containerapp create `
        --name "sentinel-soc-agent" `
        --resource-group $ResourceGroup `
        --environment "env-sentinel-soc" `
        --image "$acrLoginServer/sentinel-soc-agent:latest" `
        --target-port 8000 `
        --ingress external `
        --registry-server $acrLoginServer `
        --registry-username $AcrName `
        --registry-password $acrPassword `
        --cpu 1.0 --memory 2.0Gi

    $fqdn = az containerapp show --name "sentinel-soc-agent" --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
    Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
    Write-Host "🌐 Access your Sentinel AI SOC Portal at: https://$fqdn" -ForegroundColor Cyan
} else {
    # -------------------------------------------------------------
    # OPTION B: Deploy to Azure Kubernetes Service (AKS)
    # -------------------------------------------------------------
    Write-Host "🚀 Ensuring AKS Cluster '$AksClusterName' exists..." -ForegroundColor Yellow
    az aks create `
        --resource-group $ResourceGroup `
        --name $AksClusterName `
        --node-count 2 `
        --enable-oidc-issuer `
        --enable-workload-identity `
        --attach-acr $AcrName `
        --generate-ssh-keys `
        --output none

    Write-Host "🔑 Getting AKS Credentials..." -ForegroundColor Yellow
    az aks get-credentials --resource-group $ResourceGroup --name $AksClusterName --overwrite-existing

    Write-Host "☸️ Applying Kubernetes Manifests..." -ForegroundColor Yellow
    # Replace ACR placeholder in deployment.yaml
    (Get-Content ./k8s/deployment.yaml) -replace "your-acr.azurecr.io", $acrLoginServer | Set-Content ./k8s/deployment.yaml

    kubectl apply -f ./k8s/namespace.yaml
    kubectl apply -f ./k8s/configmap.yaml
    kubectl apply -f ./k8s/secret.yaml
    kubectl apply -f ./k8s/workload-identity.yaml
    kubectl apply -f ./k8s/deployment.yaml
    kubectl apply -f ./k8s/service.yaml

    Write-Host "⏳ Waiting for External IP / Ingress..." -ForegroundColor Yellow
    kubectl rollout status deployment/sentinel-soc-agent -n sentinel-soc

    Write-Host "🎉 AKS Deployment Complete!" -ForegroundColor Green
    Write-Host "Run 'kubectl get svc -n sentinel-soc' to get the external IP address." -ForegroundColor Cyan
}
