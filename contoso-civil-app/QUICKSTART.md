# Quick Start Guide

## 5-Minute Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Step 1: Clone & Setup
```bash
cd c:\git_2026\contoso-civil-app
cp .env.example .env
```

### Step 2: Start with Docker
```bash
npm run docker:up
```

### Step 3: Access Application
- **Frontend**: http://localhost:3100
- **API Gateway**: http://localhost:3000/api
- **Database**: localhost:1433

### Step 4: Test API
```bash
# Register a user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "role": 1
  }'

# Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

## Development Setup

### For Frontend Only
```bash
cd frontend
npm install
npm start
```
Frontend will run on http://localhost:3000

### For Backend Only
```bash
# Install dependencies
npm install --workspaces

# Start individual services in separate terminals
npm run dev --workspace=backend/api-gateway
npm run dev --workspace=backend/services/user-service
npm run dev --workspace=backend/services/job-service
npm run dev --workspace=backend/services/interview-service
npm run dev --workspace=backend/services/application-service
```

### Database Setup (Non-Docker)
```bash
# On SQL Server
sqlcmd -S localhost -U sa -P "YourPassword"

# In sqlcmd:
:r database\schema.sql
:r database\seed-data.sql
GO
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

### Database Connection Error
1. Check SQL Server is running
2. Verify credentials in .env
3. Ensure database exists

### Frontend Won't Load
```bash
# Clear cache and reinstall
rm -r frontend/node_modules frontend/package-lock.json
npm install --prefix frontend
npm start --prefix frontend
```

## Common Commands

```bash
# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Rebuild all services
npm run docker:build

# Run tests
npm run test --workspaces

# Build for production
npm run build --workspaces
```

## Default Credentials

For testing:
- Email: `student@example.com`
- Password: `Test123!`

Or register a new account at: http://localhost:3100/register

## Next Steps

1. Read [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed setup
2. Check [API.md](./docs/API.md) for API documentation
3. Review [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design
4. See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment

---

For additional help, check the individual service README files or open an issue in the repository.
