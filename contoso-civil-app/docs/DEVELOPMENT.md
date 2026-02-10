# Development Setup

## Prerequisites
- Node.js 18+
- Docker & Docker Compose (for full stack deployment)
- SQL Server or SQL Server Express

## Local Development

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Install workspace dependencies
npm install --workspaces
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup
```bash
# Using SQL Server locally
sqlcmd -S localhost -U sa -P "YourPassword" -i database/schema.sql
sqlcmd -S localhost -U sa -P "YourPassword" -i database/seed-data.sql
```

### 4. Run Services
```bash
# Start all services in development mode
npm run dev

# Or run individual services:
cd backend/api-gateway && npm run dev
cd backend/services/user-service && npm run dev
cd backend/services/job-service && npm run dev
cd backend/services/interview-service && npm run dev
cd backend/services/application-service && npm run dev
cd frontend && npm start
```

## Docker Deployment

```bash
# Build all services
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

## Service Ports
- API Gateway: 3000
- User Service: 3001
- Job Service: 3002
- Interview Service: 3003
- Application Service: 3004
- Frontend: 3100 (docker) or 3000 (local dev)
- SQL Server: 1433

## Testing API Endpoints

### User Registration
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": 1
  }'
```

### User Login
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get All Jobs
```bash
curl http://localhost:3000/api/jobs
```

## Troubleshooting

### Database Connection Issues
- Verify SQL Server is running
- Check connection string in .env
- Ensure database exists: `ContosoCivilApp`

### Service Connection Issues
- Check ports are not in use
- Verify services are running: `lsof -i :3000-3004`
- Check logs: `npm run docker:logs`

### Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf frontend/node_modules frontend/package-lock.json
npm install --prefix frontend
```
