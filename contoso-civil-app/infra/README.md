# Azure Infrastructure Deployment Guide

This guide covers deploying Contoso Civil App to Azure using Infrastructure as Code (Bicep) and CI/CD pipelines.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Azure Cloud                                     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Azure Container Apps Environment              │    │
│  │                                                                  │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │    │
│  │  │   Frontend   │────│ API Gateway  │────│ User Service │       │    │
│  │  │   (React)    │    │   (Express)  │    │   (3001)     │       │    │
│  │  │   External   │    │   External   │    │   Internal   │       │    │
│  │  └──────────────┘    └──────────────┘    └──────────────┘       │    │
│  │                             │                   │                │    │
│  │  ┌──────────────┐    ┌─────┴──────┐    ┌──────┴───────┐        │    │
│  │  │  Interview   │    │    Job     │    │ Application  │        │    │
│  │  │   Service    │    │  Service   │    │   Service    │        │    │
│  │  │   (3003)     │    │  (3002)    │    │   (3004)     │        │    │
│  │  │   Internal   │    │  Internal  │    │   Internal   │        │    │
│  │  └──────────────┘    └────────────┘    └──────────────┘        │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────┐    ┌─────────┴─────────┐    ┌─────────────────┐   │
│  │ Azure Container │    │   Azure SQL DB    │    │  Log Analytics  │   │
│  │    Registry     │    │ ContosoCivilApp   │    │    Workspace    │   │
│  └─────────────────┘    └───────────────────┘    └─────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Azure Subscription** with Contributor access
2. **Azure CLI** installed and authenticated
3. **Azure DevOps** organization (for Azure Pipelines) OR **GitHub** repository (for GitHub Actions)

## Quick Start - Manual Deployment

### 1. Login to Azure

```bash
az login
az account set --subscription "<your-subscription-id>"
```

### 2. Create Resource Group

```bash
az group create --name rg-contoso-civil-dev --location eastus
```

### 3. Deploy Infrastructure

```bash
az deployment group create \
  --name "contoso-civil-deployment" \
  --resource-group rg-contoso-civil-dev \
  --template-file infra/main.bicep \
  --parameters environment=dev \
               sqlAdminLogin=sqladmin \
               sqlAdminPassword="<your-strong-password>" \
               jwtSecret="<your-jwt-secret>"
```

### 4. Get Deployment Outputs

```bash
az deployment group show \
  --name "contoso-civil-deployment" \
  --resource-group rg-contoso-civil-dev \
  --query properties.outputs
```

## CI/CD Setup

### Option A: Azure DevOps Pipelines

#### 1. Create Variable Group

Create a variable group named `contoso-civil-app-vars` with:

| Variable | Description | Secret |
|----------|-------------|--------|
| `azureServiceConnection` | Azure service connection name | No |
| `acrServiceConnection` | ACR service connection name | No |
| `acrName` | Azure Container Registry name | No |
| `sqlAdminLogin` | SQL Server admin username | No |
| `sqlAdminPassword` | SQL Server admin password | Yes |
| `jwtSecret` | JWT signing secret | Yes |

#### 2. Create Service Connections

1. **Azure Resource Manager** - For deploying infrastructure
2. **Docker Registry (ACR)** - For pushing/pulling images

#### 3. Import Pipelines

Import these pipeline files:
- `.azure-pipelines/build-pipeline.yml` - CI pipeline
- `.azure-pipelines/deploy-pipeline.yml` - CD pipeline
- `.azure-pipelines/infra-only-pipeline.yml` - Infrastructure only

### Option B: GitHub Actions

#### 1. Configure Secrets

Go to Repository Settings → Secrets and add:

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `ACR_LOGIN_SERVER` | ACR login server URL |
| `ACR_USERNAME` | ACR admin username |
| `ACR_PASSWORD` | ACR admin password |
| `SQL_ADMIN_LOGIN` | SQL admin username |
| `SQL_ADMIN_PASSWORD` | SQL admin password |
| `JWT_SECRET` | JWT signing secret |

#### 2. Create Azure Service Principal

```bash
az ad sp create-for-rbac \
  --name "sp-contoso-civil-app" \
  --role contributor \
  --scopes /subscriptions/<subscription-id> \
  --sdk-auth
```

Copy the JSON output to `AZURE_CREDENTIALS` secret.

#### 3. Workflows

Workflows run automatically:
- **Build**: On push to `main` or `develop`
- **Deploy**: After successful build on `main`, or manual trigger

## Environment Configuration

### Environments

| Environment | Resource Group | Purpose |
|-------------|---------------|---------|
| `dev` | `rg-contoso-civil-dev` | Development/testing |
| `staging` | `rg-contoso-civil-staging` | Pre-production validation |
| `prod` | `rg-contoso-civil-prod` | Production |

### Resource Naming

Resources follow the pattern: `contoso-civil-{resource}-{env}-{suffix}`

| Resource | Example Name |
|----------|-------------|
| Container Registry | `contosocivilacrxxxxxxxx` |
| SQL Server | `contoso-civil-sql-dev-xxxxxxxx` |
| Container Apps Env | `contoso-civil-env-dev` |
| Log Analytics | `contoso-civil-logs-dev` |

## Database Setup

### Initialize Schema

After infrastructure deployment:

```bash
# Get SQL Server FQDN
SQL_FQDN=$(az sql server list -g rg-contoso-civil-dev --query "[0].fullyQualifiedDomainName" -o tsv)

# Run schema script
sqlcmd -S $SQL_FQDN -U sqladmin -P "<password>" -d ContosoCivilApp -i database/schema.sql

# Seed sample data (dev/staging only)
sqlcmd -S $SQL_FQDN -U sqladmin -P "<password>" -d ContosoCivilApp -i database/seed-data.sql
```

## Scaling Configuration

Container Apps auto-scale based on HTTP traffic:

| Service | Min Replicas | Max Replicas | CPU | Memory |
|---------|--------------|--------------|-----|--------|
| Frontend | 1 | 3 | 0.25 | 0.5Gi |
| API Gateway | 1 | 5 | 0.5 | 1Gi |
| User Service | 1 | 3 | 0.25 | 0.5Gi |
| Job Service | 1 | 3 | 0.25 | 0.5Gi |
| Interview Service | 1 | 3 | 0.25 | 0.5Gi |
| Application Service | 1 | 3 | 0.25 | 0.5Gi |

## Cost Estimation (Dev Environment)

| Resource | SKU | Estimated Monthly Cost |
|----------|-----|------------------------|
| Container Registry | Basic | ~$5 |
| SQL Database | Basic (5 DTU) | ~$5 |
| Container Apps | Consumption | ~$20-50 (based on usage) |
| Log Analytics | Pay-as-you-go | ~$5 |
| **Total** | | **~$35-65/month** |

## Troubleshooting

### View Container Logs

```bash
az containerapp logs show \
  --name contoso-civil-api-gateway \
  --resource-group rg-contoso-civil-dev \
  --follow
```

### Check Container App Status

```bash
az containerapp show \
  --name contoso-civil-frontend \
  --resource-group rg-contoso-civil-dev \
  --query "properties.runningStatus"
```

### Update Container Image Manually

```bash
az containerapp update \
  --name contoso-civil-frontend \
  --resource-group rg-contoso-civil-dev \
  --image <acr-name>.azurecr.io/frontend:latest
```

### SQL Connection Issues

Ensure firewall allows Azure services:
```bash
az sql server firewall-rule create \
  --resource-group rg-contoso-civil-dev \
  --server <sql-server-name> \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Security Best Practices

1. **Secrets Management**: Store secrets in Azure Key Vault for production
2. **Network Isolation**: Use VNet integration for internal services
3. **RBAC**: Apply least-privilege access to resources
4. **TLS**: All external endpoints use HTTPS by default
5. **SQL Firewall**: Restrict access to known IP ranges in production

## Next Steps

- [ ] Configure custom domain and SSL certificates
- [ ] Set up Azure Key Vault for secrets management
- [ ] Enable Azure Monitor alerts
- [ ] Configure backup and disaster recovery
- [ ] Implement VNet integration for enhanced security
