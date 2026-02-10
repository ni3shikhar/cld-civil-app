# Contoso Civil App

A comprehensive three-tier microservice-based application for civil engineering job management and training. The platform connects students, employers, and administrators in a unified ecosystem.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React/TS)                  │
│  ┌────────────────┬──────────────┬──────────────────────┐   │
│  │ Student Portal │ Employer Hub │ Admin Dashboard      │   │
│  └────────────────┴──────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ REST API
┌──────────────────────────────────────────────────────────────┐
│                    API Gateway (Port 3000)                    │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend Microservices (Node.js/Express)         │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ User Service │ Job Service  │ Interview Service      │ │
│  │ (Port 3001)  │ (Port 3002)  │ (Port 3003)            │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Application Service (Port 3004)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    SQL Server Database                        │
│                    Port: 1433                                 │
└──────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ContosoCivilApp/
├── frontend/                    # React TypeScript Frontend
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components by persona
│   │   ├── services/           # API client services
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── api-gateway/            # Express API Gateway
│   │   ├── src/routes/
│   │   ├── src/middleware/
│   │   └── package.json
│   │
│   └── services/
│       ├── user-service/       # User management & authentication
│       ├── job-service/        # Job postings & requisitions
│       ├── interview-service/  # Interview questions & assessments
│       └── application-service/ # Job applications handling
│
├── database/                   # SQL Schema & Migrations
│   ├── schema.sql
│   └── seed-data.sql
│
├── .docker/                    # Docker configurations
│   ├── Dockerfile.frontend
│   ├── Dockerfile.api-gateway
│   ├── Dockerfile.services
│   └── docker-compose.yml
│
└── .env                        # Environment variables
```

## Features by Persona

### 👨‍🎓 Student
- Create and manage login profile
- View job applications and status
- Browse civil domain-specific interview questions
- Access civil engineering knowledge articles
- View job opportunities

### 💼 Employer
- Self-registration and profile setup
- Submit and manage job requisitions
- Assess and review job applications
- View student profiles and qualifications
- Track hiring pipeline

### 👨‍💼 Administrator
- Post civil domain-specific interview questions
- Approve/reject job requisitions
- Manage user profiles and permissions
- Monitor platform activity
- Generate reports and analytics

## Technology Stack

**Frontend:**
- React 18
- TypeScript
- Redux Toolkit (State Management)
- Material-UI / Tailwind CSS
- Axios

**Backend:**
- Node.js with Express.js
- TypeScript
- JWT for authentication
- Validation libraries

**Database:**
- SQL Server
- Entity Framework Core (if using .NET) or raw SQL

**Deployment:**
- Docker & Docker Compose
- Azure Container Apps
- Azure SQL Database
- CI/CD with Azure DevOps or GitHub Actions

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- SQL Server (local or container)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ContosoCivilApp
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose -f .docker/docker-compose.yml up -d
   ```

4. **Initialize database**
   ```bash
   # This runs automatically with docker-compose
   ```

5. **Access the application**
   - Frontend: http://localhost:3000 (after frontend build)
   - API Gateway: http://localhost:3000/api
   - API Docs: http://localhost:3000/api/docs

### Development Setup

**Backend Services:**
```bash
cd backend/services/user-service
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

**API Gateway:**
```bash
cd backend/api-gateway
npm install
npm run dev
```

## Deploy to Azure (Manual)

### Prerequisites
- Azure CLI installed and authenticated (`az login`)
- Docker Desktop running
- Azure subscription with Contributor access

### Step 1: Create Resource Group

```bash
az group create --name rg-contoso-civil-dev --location westus2
```

### Step 2: Deploy Infrastructure with Bicep

```bash
az deployment group create \
  --resource-group rg-contoso-civil-dev \
  --template-file infra/main.bicep \
  --parameters environment=dev \
               location=westus2 \
               sqlAdminPassword="YourStrongP@ssword123!" \
               jwtSecret="your-32-character-jwt-secret-key"
```

### Step 3: Get Deployment Outputs

```bash
az deployment group show \
  -g rg-contoso-civil-dev \
  -n main \
  --query properties.outputs
```

Save these values:
- `acrLoginServer` - Container Registry URL
- `acrName` - Container Registry name
- `frontendUrl` - Frontend application URL
- `apiGatewayUrl` - API Gateway URL
- `sqlServerFqdn` - SQL Server hostname

### Step 4: Initialize Database

Open Azure Portal → SQL databases → ContosoCivilApp → Query editor

Login with your SQL admin credentials and run:

1. Copy content from `database/schema.sql` (run in batches, removing `GO` statements)
2. Copy content from `database/seed-data.sql`

**Sample seed data** (run this in Query editor):
```sql
-- Insert users (password: password123)
INSERT INTO Users (Email, PasswordHash, FirstName, LastName, RoleId)
VALUES 
('admin@contoso.com', '$2a$10$rQnM1vG5T.VhJ8uxJHXOxeKwZ3NJvL5vKxYwZ3NJvL5vKxYwZ3NJv', 'Admin', 'User', 3),
('employer@acmecivil.com', '$2a$10$rQnM1vG5T.VhJ8uxJHXOxeKwZ3NJvL5vKxYwZ3NJvL5vKxYwZ3NJv', 'John', 'Smith', 2),
('student@university.edu', '$2a$10$rQnM1vG5T.VhJ8uxJHXOxeKwZ3NJvL5vKxYwZ3NJvL5vKxYwZ3NJv', 'Jane', 'Doe', 1);
```

### Step 5: Build and Push Docker Images

```bash
# Login to Azure Container Registry
az acr login --name <acrName>

# Set ACR URL variable
ACR=<acrLoginServer>  # e.g., contosocivilacr12345.azurecr.io

# Build and push Frontend
docker build -f .docker/Dockerfile.frontend -t $ACR/frontend:latest .
docker push $ACR/frontend:latest

# Build and push API Gateway
docker build -f .docker/Dockerfile.api-gateway -t $ACR/api-gateway:latest .
docker push $ACR/api-gateway:latest

# Build and push User Service
docker build -f .docker/Dockerfile.services --build-arg SERVICE_NAME=user-service -t $ACR/user-service:latest .
docker push $ACR/user-service:latest

# Build and push Job Service
docker build -f .docker/Dockerfile.services --build-arg SERVICE_NAME=job-service -t $ACR/job-service:latest .
docker push $ACR/job-service:latest

# Build and push Interview Service
docker build -f .docker/Dockerfile.services --build-arg SERVICE_NAME=interview-service -t $ACR/interview-service:latest .
docker push $ACR/interview-service:latest

# Build and push Application Service
docker build -f .docker/Dockerfile.services --build-arg SERVICE_NAME=application-service -t $ACR/application-service:latest .
docker push $ACR/application-service:latest
```

### Step 6: Update Container Apps with Real Images

```bash
RG=rg-contoso-civil-dev
ACR=<acrLoginServer>

# Update all services
az containerapp update --name civil-frontend --resource-group $RG --image $ACR/frontend:latest
az containerapp update --name civil-api-gateway --resource-group $RG --image $ACR/api-gateway:latest
az containerapp update --name civil-user-service --resource-group $RG --image $ACR/user-service:latest
az containerapp update --name civil-job-service --resource-group $RG --image $ACR/job-service:latest
az containerapp update --name civil-interview-service --resource-group $RG --image $ACR/interview-service:latest
az containerapp update --name civil-app-svc --resource-group $RG --image $ACR/application-service:latest
```

### Step 7: Verify Deployment

```bash
# Check all container apps status
az containerapp list --resource-group $RG --query "[].{Name:name, Status:properties.runningStatus}" -o table

# Get application URLs
az containerapp show --name civil-frontend --resource-group $RG --query "properties.configuration.ingress.fqdn" -o tsv
az containerapp show --name civil-api-gateway --resource-group $RG --query "properties.configuration.ingress.fqdn" -o tsv
```

### Step 8: Access Your Application

- **Frontend**: `https://civil-frontend.<environment-id>.<region>.azurecontainerapps.io`
- **API Gateway**: `https://civil-api-gateway.<environment-id>.<region>.azurecontainerapps.io`

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@contoso.com | password123 |
| Employer | employer@acmecivil.com | password123 |
| Student | student@university.edu | password123 |

### Cleanup Resources

```bash
# Delete all resources when done
az group delete --name rg-contoso-civil-dev --yes --no-wait
```

### Troubleshooting

**View Container Logs:**
```bash
az containerapp logs show --name civil-api-gateway --resource-group $RG --follow
```

**Check Container Status:**
```bash
az containerapp show --name civil-frontend --resource-group $RG --query "properties.runningStatus"
```

**Restart a Container App:**
```bash
az containerapp revision restart --name civil-frontend --resource-group $RG --revision <revision-name>
```

For CI/CD pipeline setup, see [infra/README.md](./infra/README.md).

## API Endpoints

### User Service (Port 3001)
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/roles/:role` - Get users by role

### Job Service (Port 3002)
- `GET /api/jobs` - List all job postings
- `POST /api/jobs` - Create new job requisition
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job requisition
- `DELETE /api/jobs/:id` - Delete job posting

### Interview Service (Port 3003)
- `GET /api/questions` - Get interview questions
- `POST /api/questions` - Create new question
- `GET /api/questions/:domain` - Get questions by civil domain
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question

### Application Service (Port 3004)
- `GET /api/applications` - List applications
- `POST /api/applications` - Submit application
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id/status` - Update application status
- `GET /api/applications/student/:studentId` - Get student's applications

## Database Schema

The SQL Server database includes tables for:
- `Users` - All user accounts
- `StudentProfiles` - Student-specific information
- `EmployerProfiles` - Employer-specific information
- `JobRequisitions` - Job postings
- `JobApplications` - Application submissions
- `InterviewQuestions` - Civil domain questions
- `KnowledgeArticles` - Learning resources
- `UserRoles` - Role-based access control
- `Audit` - Activity logging

## Documentation

- [API Documentation](./docs/API.md)
- [Database Schema](./database/schema.sql)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@contosocivil.com or open an issue in the repository.
