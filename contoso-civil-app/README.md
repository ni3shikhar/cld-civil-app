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
- Support for Kubernetes (future)

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
