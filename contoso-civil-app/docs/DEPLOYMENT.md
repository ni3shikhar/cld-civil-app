# Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Azure subscription (if deploying to Azure)
- Git for version control

## Local Development Deployment

### 1. Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd contoso-civil-app

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or edit in your editor
```

### 2. Database Setup
```bash
# Create database and tables
sqlcmd -S localhost -U sa -P "YourPassword" -i database/schema.sql
sqlcmd -S localhost -U sa -P "YourPassword" -i database/seed-data.sql
```

### 3. Install Dependencies
```bash
npm install --workspaces
```

### 4. Start Services
```bash
# Development mode (all services)
npm run dev

# Or start individual services in separate terminals:
npm run dev --workspace=backend/api-gateway
npm run dev --workspace=backend/services/user-service
npm run dev --workspace=backend/services/job-service
npm run dev --workspace=backend/services/interview-service
npm run dev --workspace=backend/services/application-service
npm start --workspace=frontend
```

### 5. Access Application
- Frontend: http://localhost:3100 (Docker) or http://localhost:3000 (dev)
- API Gateway: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs (when implemented)

---

## Docker Deployment (Recommended)

### 1. Build Services
```bash
# Build all Docker images
npm run docker:build

# Or manually:
docker-compose -f .docker/docker-compose.yml build
```

### 2. Start Services
```bash
# Start all services
npm run docker:up

# Or manually:
docker-compose -f .docker/docker-compose.yml up -d
```

### 3. View Logs
```bash
npm run docker:logs

# Or for specific service:
docker-compose -f .docker/docker-compose.yml logs -f api-gateway
```

### 4. Stop Services
```bash
npm run docker:down

# Or manually:
docker-compose -f .docker/docker-compose.yml down
```

### 5. Verify Deployment
```bash
# Check running containers
docker ps

# Check service health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

---

## Azure Deployment

### Option 1: Azure Container Instances (ACI)

#### 1. Push Images to Azure Container Registry
```bash
# Login to Azure
az login

# Create container registry
az acr create --resource-group contoso-civil-rg \
  --name contosocivilacr --sku Basic

# Build and push images
az acr build --registry contosocivilacr \
  --image api-gateway:latest -f .docker/Dockerfile.api-gateway .

# Repeat for other services...
```

#### 2. Deploy to Container Instances
```bash
# Deploy via docker-compose
az container create --resource-group contoso-civil-rg \
  --name contoso-civil-app \
  --image contosocivilacr.azurecr.io/api-gateway:latest \
  --registry-login-server contosocivilacr.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --ports 3000 --ip-address Public
```

### Option 2: Azure App Service

#### 1. Create App Service Plan
```bash
az appservice plan create --name contoso-civil-plan \
  --resource-group contoso-civil-rg --sku B1 --is-linux
```

#### 2. Create Web App
```bash
az webapp create --resource-group contoso-civil-rg \
  --plan contoso-civil-plan --name contoso-civil-app \
  --deployment-container-image-name-user <acr-name>.azurecr.io \
  --deployment-container-image-name contoso-civil-app:latest
```

#### 3. Deploy via GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Build and Push
        run: |
          docker build -f .docker/Dockerfile.api-gateway -t api-gateway:latest .
          # Push to registry and deploy...
```

### Option 3: Azure Kubernetes Service (AKS)

#### 1. Create AKS Cluster
```bash
az aks create --resource-group contoso-civil-rg \
  --name contoso-civil-aks --node-count 3 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard
```

#### 2. Deploy with Helm (Recommended)
```bash
# Create helm chart
helm create contoso-civil-app

# Deploy
helm install contoso-civil ./contoso-civil-app/
```

---

## Database Deployment

### Azure SQL Database
```bash
# Create SQL Server
az sql server create --resource-group contoso-civil-rg \
  --name contososqlserver --admin-user sqladmin \
  --admin-password <strong-password>

# Create database
az sql db create --resource-group contoso-civil-rg \
  --server contososqlserver --name ContosoCivilApp

# Run schema script
sqlcmd -S contososqlserver.database.windows.net \
  -U sqladmin -P <password> -i database/schema.sql
```

---

## Configuration Management

### Environment Variables by Environment

**Development (.env.development)**
```
NODE_ENV=development
DB_HOST=localhost
API_GATEWAY_PORT=3000
LOG_LEVEL=debug
```

**Production (.env.production)**
```
NODE_ENV=production
DB_HOST=contosos-sqlserver.database.windows.net
API_GATEWAY_PORT=443
LOG_LEVEL=error
JWT_SECRET=<use-azure-keyvault>
```

### Azure Key Vault Integration
```bash
# Create Key Vault
az keyvault create --resource-group contoso-civil-rg \
  --name contoso-civil-kv

# Store secrets
az keyvault secret set --vault-name contoso-civil-kv \
  --name jwt-secret --value "<your-secret>"

# Reference in app
const secret = await keyVaultClient.getSecret("jwt-secret");
```

---

## Monitoring & Logging

### Application Insights
```bash
# Create Application Insights
az monitor app-insights component create \
  --app contoso-civil-app \
  --location eastus \
  --resource-group contoso-civil-rg \
  --application-type node

# Configure in app
const appInsights = require("applicationinsights");
appInsights.setup("<INSTRUMENTATION_KEY>").start();
```

### Logs
```bash
# View container logs
docker logs <container-id>

# View Application Insights logs
az monitor app-insights metrics show \
  --resource-group contoso-civil-rg \
  --name contoso-civil-app
```

---

## Scaling

### Horizontal Scaling (Docker Compose)
```bash
# Scale API Gateway
docker-compose -f .docker/docker-compose.yml up -d --scale api-gateway=3
```

### Load Balancing (Nginx)
Create `nginx.conf`:
```nginx
upstream api-gateway {
  server api-gateway-1:3000;
  server api-gateway-2:3000;
  server api-gateway-3:3000;
}

server {
  listen 80;
  location / {
    proxy_pass http://api-gateway;
  }
}
```

---

## Backup & Recovery

### Database Backup
```bash
# SQL Server backup
BACKUP DATABASE [ContosoCivilApp] 
TO DISK = '/var/opt/mssql/backup/ContosoCivilApp.bak'

# Azure Automatic Backup
# (Enabled by default for Azure SQL Database)
```

### Disaster Recovery
```bash
# Create geo-replica
az sql db replica create \
  --resource-group contoso-civil-rg \
  --server contososqlserver \
  --name ContosoCivilApp \
  --partner-server contososqlserver-dr \
  --partner-resource-group contoso-civil-rg-dr
```

---

## Security Hardening

### 1. SSL/TLS Certificates
```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem -days 365 -nodes

# Use Let's Encrypt (recommended)
certbot certonly --standalone -d yourdomain.com
```

### 2. Firewall Rules
```bash
# Azure Firewall
az sql server firewall-rule create \
  --resource-group contoso-civil-rg \
  --server contososqlserver \
  --name AllowAppService \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 3. Network Security
```bash
# Create Network Security Group
az network nsg create --resource-group contoso-civil-rg \
  --name contoso-civil-nsg

# Add rules
az network nsg rule create --resource-group contoso-civil-rg \
  --nsg-name contoso-civil-nsg --name AllowHTTPSInbound \
  --priority 100 --destination-port-ranges 443 \
  --protocol Tcp --access Allow --direction Inbound
```

---

## Troubleshooting

### Service Won't Start
1. Check logs: `docker logs <container-id>`
2. Verify environment variables: `docker inspect <container-id>`
3. Check port availability: `netstat -an | grep 3000`

### Database Connection Error
1. Verify connection string format
2. Check database user permissions
3. Ensure database is accessible: `telnet db-host 1433`

### Performance Issues
1. Check resource usage: `docker stats`
2. Review slow queries in logs
3. Consider database optimization
4. Implement caching layer

---

## Rollback Procedure

```bash
# Docker rollback
docker-compose -f .docker/docker-compose.yml down
docker images prune  # Remove old images
git checkout <previous-commit>
npm run docker:build
npm run docker:up
```

---

## Post-Deployment Verification

```bash
# Health check all services
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health

# Test API endpoints
curl http://localhost:3000/api/jobs
curl http://localhost:3000/api/questions

# Check database connectivity
sqlcmd -S <server> -U <user> -P <password> -Q "SELECT 1"
```

