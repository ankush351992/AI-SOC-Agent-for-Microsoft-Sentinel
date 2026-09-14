#!/usr/bin/env bash
# ==============================================================================
# 🚀 Sentinel AI SOC Agent - Automated Azure Deployment Script (Bash)
# Target: Azure Kubernetes Service (AKS) or Azure Container Apps (ACA)
# ==============================================================================

set -e

RESOURCE_GROUP=${1:-"rg-sentinel-soc-prod"}
LOCATION=${2:-"eastus"}
ACR_NAME=${3:-"acrsentinelsoc$RANDOM"}
AKS_CLUSTER_NAME=${4:-"aks-sentinel-soc"}
DEPLOYMENT_TARGET=${5:-"aks"} # "aks" or "containerapp"

echo "========================================================="
echo "🛡️ Deploying Sentinel AI SOC Agent to Microsoft Azure"
echo "========================================================="

# 1. Check Azure Login
az account show --output none || { echo "❌ Run 'az login' first."; exit 1; }

echo "📦 Creating Resource Group '$RESOURCE_GROUP' in '$LOCATION'..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

echo "📦 Creating Azure Container Registry '$ACR_NAME'..."
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true --output none

echo "🔨 Building container image in Azure Cloud Build (no local Docker required)..."
az acr build --registry "$ACR_NAME" --image sentinel-soc-agent:latest .

ACR_LOGIN_SERVER="$ACR_NAME.azurecr.io"
echo "✅ Image built: $ACR_LOGIN_SERVER/sentinel-soc-agent:latest"

if [ "$DEPLOYMENT_TARGET" == "containerapp" ]; then
    echo "🚀 Deploying to Azure Container Apps (Serverless)..."
    ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

    az containerapp env create --name "env-sentinel-soc" --resource-group "$RESOURCE_GROUP" --location "$LOCATION" --output none

    az containerapp create \
        --name "sentinel-soc-agent" \
        --resource-group "$RESOURCE_GROUP" \
        --environment "env-sentinel-soc" \
        --image "$ACR_LOGIN_SERVER/sentinel-soc-agent:latest" \
        --target-port 8000 \
        --ingress external \
        --registry-server "$ACR_LOGIN_SERVER" \
        --registry-username "$ACR_NAME" \
        --registry-password "$ACR_PASSWORD" \
        --cpu 1.0 --memory 2.0Gi

    FQDN=$(az containerapp show --name "sentinel-soc-agent" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)
    echo "🎉 Deployment Complete!"
    echo "🌐 Access your Sentinel AI SOC Portal at: https://$FQDN"
else
    echo "🚀 Ensuring AKS Cluster '$AKS_CLUSTER_NAME' exists..."
    az aks create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$AKS_CLUSTER_NAME" \
        --node-count 2 \
        --enable-oidc-issuer \
        --enable-workload-identity \
        --attach-acr "$ACR_NAME" \
        --generate-ssh-keys \
        --output none

    echo "🔑 Getting AKS Credentials..."
    az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER_NAME" --overwrite-existing

    echo "☸️ Applying Kubernetes Manifests..."
    sed -i "s/your-acr.azurecr.io/$ACR_LOGIN_SERVER/g" ./k8s/deployment.yaml

    kubectl apply -f ./k8s/namespace.yaml
    kubectl apply -f ./k8s/configmap.yaml
    kubectl apply -f ./k8s/secret.yaml
    kubectl apply -f ./k8s/workload-identity.yaml
    kubectl apply -f ./k8s/deployment.yaml
    kubectl apply -f ./k8s/service.yaml

    kubectl rollout status deployment/sentinel-soc-agent -n sentinel-soc
    echo "🎉 AKS Deployment Complete!"
    echo "Run 'kubectl get svc -n sentinel-soc' to retrieve your external IP."
fi
