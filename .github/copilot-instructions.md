# Contoso Civil App - Project Guidelines

## Project Overview
A three-tier microservice-based platform for civil engineering job management with support for three personas: Students, Employers, and Administrators.

## Architecture
- **Frontend**: React 18 with TypeScript (3 portal views)
- **Backend**: Node.js/Express microservices (4 services)
- **Database**: SQL Server
- **Gateway**: Express API Gateway
- **Deployment**: Docker & Docker Compose

## Service Responsibilities

### API Gateway (Port 3000)
- Request routing and load balancing
- Authentication middleware
- Rate limiting
- Request/response logging
- CORS handling

### User Service (Port 3001)
- User registration and authentication
- Profile management (Students, Employers, Admins)
- Role-based access control
- JWT token management
- User validation

### Job Service (Port 3002)
- Job requisition creation and management
- Job posting CRUD operations
- Job filtering and search
- Employer job management
- Civil domain categorization

### Interview Service (Port 3003)
- Interview question management
- Civil domain-specific questions
- Question assessment and grading
- Knowledge article management
- Interview question validation

### Application Service (Port 3004)
- Job application submission and tracking
- Application status management (Submitted, Under Review, Shortlisted, Rejected)
- Student application history
- Employer application review
- Assessment submission

## Database Design
- Normalized relational schema
- Supporting all CRUD operations
- Audit logging tables
- User role administration

## Development Guidelines
- Use TypeScript for type safety
- Implement proper error handling
- Use JWT for authentication
- Add request validation
- Implement service-to-service communication
- Use environment variables for configuration
- Follow REST API conventions

## Key Endpoints Usage Pattern
```
/api/{service}/resource/{id}
```

## Common Workflows
1. **Student Registration**: User Service → API Gateway
2. **Job Application**: Application Service → API Gateway
3. **Question Assessment**: Interview Service → API Gateway
4. **Job Management**: Job Service → API Gateway
