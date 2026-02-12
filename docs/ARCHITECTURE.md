# Architecture Documentation

## Overview
Contoso Civil App is a three-tier microservice-based application designed for civil engineering job management and training. The architecture follows the microservices pattern with clear separation of concerns.

## Tier 1: Frontend (React 18 + TypeScript)

### Technology Stack
- React 18 for UI rendering
- TypeScript for type safety
- Redux Toolkit for state management
- Material-UI for UI components
- Axios for HTTP client
- React Router for navigation

### Portal Views
1. **Student Portal**: Job search, applications, learning resources
2. **Employer Hub**: Job postings, application management
3. **Admin Dashboard**: Content management, user administration

### Key Features
- JWT-based authentication
- Role-based access control
- Real-time status updates
- Responsive design

## Tier 2: Backend Microservices (Node.js/Express)

### API Gateway (Port 3000)
**Responsibilities:**
- Request routing to appropriate services
- Authentication/Authorization
- Rate limiting
- Request validation
- CORS handling
- API documentation

**Key Endpoints:**
- `/api/users/*` → User Service
- `/api/jobs/*` → Job Service
- `/api/questions/*` → Interview Service
- `/api/applications/*` → Application Service

### User Service (Port 3001)
**Responsibilities:**
- User registration and authentication
- Profile management (Students, Employers, Admins)
- JWT token generation
- Password hashing with bcrypt

**Database Tables:**
- Users
- StudentProfiles
- EmployerProfiles
- UserRoles

**Key Endpoints:**
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User authentication
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update profile

### Job Service (Port 3002)
**Responsibilities:**
- Job requisition CRUD operations
- Job filtering and search
- Civil domain categorization
- Job posting management

**Database Tables:**
- JobRequisitions
- EmployerProfiles

**Key Endpoints:**
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create new job
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Interview Service (Port 3003)
**Responsibilities:**
- Interview question management
- Civil domain-specific questions
- Question assessment and grading
- Knowledge article management

**Database Tables:**
- InterviewQuestions
- QuestionOptions
- KnowledgeArticles

**Key Endpoints:**
- `GET /api/questions` - Get all questions
- `POST /api/questions` - Create question
- `GET /api/questions/domain/:domain` - Get by domain
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question

### Application Service (Port 3004)
**Responsibilities:**
- Job application submission
- Application status tracking
- Student application history
- Employer application review

**Database Tables:**
- JobApplications
- InterviewAssessments
- StudentResponses

**Key Endpoints:**
- `GET /api/applications` - List applications
- `POST /api/applications` - Submit application
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id/status` - Update status
- `GET /api/applications/student/:studentId` - Student's applications

## Tier 3: Database (SQL Server)

### Schema Overview

```
Users (Core)
├── StudentProfiles
├── EmployerProfiles
└── UserRoles

JobRequisitions
├── JobApplications
│   └── InterviewAssessments
│       └── StudentResponses
└── EmployerProfiles

InterviewQuestions
├── QuestionOptions
└── KnowledgeArticles

Audit (Logging)
```

### Key Tables
- **Users**: Central user registry with authentication
- **StudentProfiles**: Student-specific information
- **EmployerProfiles**: Employer company information
- **JobRequisitions**: Job postings
- **JobApplications**: Student applications to jobs
- **InterviewQuestions**: Civil domain interview questions
- **InterviewAssessments**: Assessment records
- **StudentResponses**: Student answers to questions
- **KnowledgeArticles**: Learning resources
- **Audit**: Activity logging for compliance

### Civil Engineering Domains
- Structural Engineering
- Geotechnical Engineering
- Transportation Engineering
- Environmental Engineering
- Water Resources Engineering
- Construction Engineering
- Hydraulics Engineering
- Urban Planning

## Communication Flow

### Service-to-Service Communication
- Synchronous: REST API (via axios)
- Authentication: JWT tokens in Authorization header
- Data Format: JSON

### Request Flow Example
```
1. Client Request
   ↓
2. API Gateway (authentication, routing)
   ↓
3. Microservice (business logic)
   ↓
4. SQL Database (data persistence)
   ↓
5. Response (formatted JSON)
   ↓
6. Client (display/process)
```

## Security Architecture

### Authentication
- JWT-based token authentication
- Tokens contain user ID and role
- Tokens expire per JWT_EXPIRATION setting
- Refresh token not implemented (stateless)

### Authorization
- Role-based access control (RBAC)
- Roles: Student, Employer, Administrator
- Middleware validates user roles

### Password Security
- bcryptjs for hashing (10 salt rounds)
- No plain text passwords stored
- Password minimum length recommended

### Data Protection
- HTTPS/TLS in production
- Database encryption recommended
- Sensitive data should be encrypted

## Scalability Considerations

### Horizontal Scaling
- Stateless microservices
- Load balancer in front of API Gateway
- Multiple instances of each service

### Vertical Scaling
- Connection pooling for database
- Caching layer (Redis) optional
- Database optimization needed

### Future Enhancements
- API versioning
- GraphQL layer
- Event-driven architecture
- Message queuing (RabbitMQ/Kafka)
- Microservice discovery
- Circuit breaker pattern

## Deployment Strategy

### Development
- Local setup with Node.js
- Local SQL Server instance
- npm dev scripts

### Production
- Docker containers
- Kubernetes orchestration
- Azure App Service or similar
- Azure SQL Database
- Application Insights monitoring

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Monitoring & Logging

### Log Levels
- DEBUG: Development debugging
- INFO: General information
- WARN: Warning messages
- ERROR: Error messages

### Log Format
- JSON format for structured logging
- Timestamp included
- Service name included
- Request ID for tracing

## Performance Targets

- API Response Time: < 200ms (p95)
- Database Query Time: < 100ms
- Frontend Load Time: < 2 seconds
- Availability: 99.5%
- Error Rate: < 0.1%
