#!/usr/bin/env bash
# ==============================================================================
# Microsoft Sentinel AI SOC Agent - Automated Deployment Script for AKS
# Autonomous AI Incident Triage Platform for Microsoft Sentinel & Defender XDR
# ==============================================================================

set -euo pipefail

SUBSCRIPTION_ID="${1:-YOUR_AZURE_SUBSCRIPTION_ID}"
RESOURCE_GROUP="${2:-rg-sentinel-soc}"
AKS_CLUSTER_NAME="${3:-aks-sentinel-soc}"
ACR_NAME="${4:-sentinelsocregistry}"
LOCATION="${5:-eastus}"

echo "========================================================"
echo "🚀 Deploying Microsoft Sentinel AI SOC Platform to AKS"
echo "========================================================"

# 1. Set Subscription
echo "🔹 Setting Azure Subscription: $SUBSCRIPTION_ID..."
az account set --subscription "$SUBSCRIPTION_ID"

# 2. Check / Create ACR
echo "🔹 Checking Azure Container Registry ($ACR_NAME)..."
if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo "📦 Creating Azure Container Registry: $ACR_NAME..."
    az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Premium --location "$LOCATION"
fi

# 3. Build Container Image in ACR
echo "🔹 Building Container Image in ACR..."
az acr build --registry "$ACR_NAME" --image "sentinel-soc-agent:latest" ..

# 4. Check / Create AKS Cluster
echo "🔹 Checking AKS Cluster ($AKS_CLUSTER_NAME)..."
if ! az aks show --name "$AKS_CLUSTER_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo "☸️ Creating Production AKS Cluster ($AKS_CLUSTER_NAME)..."
    az aks create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$AKS_CLUSTER_NAME" \
        --node-count 2 \
        --node-vm-size Standard_D4s_v5 \
        --enable-managed-identity \
        --attach-acr "$ACR_NAME" \
        --generate-ssh-keys \
        --location "$LOCATION"
else
    echo "🔗 Ensuring ACR ($ACR_NAME) is attached to AKS ($AKS_CLUSTER_NAME)..."
    az aks update --name "$AKS_CLUSTER_NAME" --resource-group "$RESOURCE_GROUP" --attach-acr "$ACR_NAME" --output none
fi

# 5. Fetch AKS Credentials
echo "🔹 Fetching AKS Cluster Credentials..."
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER_NAME" --overwrite-existing

# 6. Apply Kubernetes Manifests
LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query "loginServer" -o tsv)
sed -i "s/YOUR_ACR_NAME\.azurecr\.io/$LOGIN_SERVER/g" deployment.yaml

echo "🔹 Applying Kubernetes Manifests via Kustomize..."
kubectl apply -k .

# 7. Rollout Status
echo "⏳ Waiting for Sentinel SOC Agent rollout to complete..."
kubectl rollout status deployment/sentinel-soc-agent -n sentinel-soc --timeout=180s

echo "========================================================"
echo "✅ Deployment Successfully Completed!"
echo "========================================================"
kubectl get svc -n sentinel-soc
