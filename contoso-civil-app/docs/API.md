# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints except `/users/register` and `/users/login` require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## User Service Endpoints

### Register User
```
POST /users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": 1
}

Response: 201 Created
{
  "message": "User registered successfully"
}
```

### Login
```
POST /users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": 1
}
```

### Get User Profile
```
GET /users/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "UserId": 1,
  "Email": "user@example.com",
  "FirstName": "John",
  "LastName": "Doe",
  "RoleId": 1
}
```

### Update User Profile
```
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}

Response: 200 OK
{
  "message": "Profile updated successfully"
}
```

## Job Service Endpoints

### Get All Jobs
```
GET /jobs

Response: 200 OK
[
  {
    "JobId": 1,
    "JobTitle": "Structural Engineer",
    "CivilDomain": "Structural Engineering",
    "Salary": 75000,
    "JobLocation": "New York, NY"
  }
]
```

### Get Job by ID
```
GET /jobs/:id

Response: 200 OK
{
  "JobId": 1,
  "JobTitle": "Structural Engineer",
  "CivilDomain": "Structural Engineering",
  "JobDescription": "...",
  "Salary": 75000
}
```

### Create Job Requisition
```
POST /jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "employerId": 1,
  "jobTitle": "Civil Engineer",
  "jobDescription": "We are looking for...",
  "requiredSkills": "AutoCAD, Revit, STAAD.Pro",
  "civilDomain": "Structural Engineering",
  "salary": 85000,
  "jobLocation": "San Francisco, CA"
}

Response: 201 Created
{
  "message": "Job created successfully"
}
```

### Update Job
```
PUT /jobs/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobTitle": "Senior Civil Engineer",
  "salary": 95000
}

Response: 200 OK
{
  "message": "Job updated successfully"
}
```

### Delete Job
```
DELETE /jobs/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Job deleted successfully"
}
```

## Interview Service Endpoints

### Get All Questions
```
GET /questions

Response: 200 OK
[
  {
    "QuestionId": 1,
    "QuestionText": "What is bearing capacity?",
    "CivilDomain": "Geotechnical Engineering",
    "DifficultyLevel": "Medium"
  }
]
```

### Get Questions by Domain
```
GET /questions/domain/:domain

Response: 200 OK
[
  {
    "QuestionId": 1,
    "QuestionText": "...",
    "CivilDomain": "Structural Engineering"
  }
]
```

### Create Question
```
POST /questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "createdBy": 1,
  "civilDomain": "Structural Engineering",
  "questionCategory": "Conceptual",
  "questionText": "Define stress and strain",
  "correctAnswer": "Stress is force per unit area, strain is deformation per unit length",
  "difficultyLevel": "Medium"
}

Response: 201 Created
{
  "message": "Question created successfully"
}
```

### Update Question
```
PUT /questions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "questionText": "...",
  "correctAnswer": "..."
}

Response: 200 OK
{
  "message": "Question updated successfully"
}
```

### Delete Question
```
DELETE /questions/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Question deleted successfully"
}
```

## Application Service Endpoints

### Get All Applications
```
GET /applications
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "ApplicationId": 1,
    "JobId": 1,
    "StudentId": 1,
    "ApplicationStatus": "Submitted",
    "AppliedDate": "2024-01-15T10:30:00Z"
  }
]
```

### Submit Application
```
POST /applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": 1,
  "studentId": 1,
  "userId": 1,
  "coverLetter": "I am interested in this position..."
}

Response: 201 Created
{
  "message": "Application submitted successfully"
}
```

### Get Application by ID
```
GET /applications/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "ApplicationId": 1,
  "JobId": 1,
  "StudentId": 1,
  "ApplicationStatus": "Under Review",
  "AppliedDate": "2024-01-15T10:30:00Z",
  "ReviewedBy": 2,
  "ReviewDate": "2024-01-16T14:20:00Z"
}
```

### Update Application Status
```
PUT /applications/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Shortlisted"
}

Response: 200 OK
{
  "message": "Application status updated successfully"
}
```

### Get Student's Applications
```
GET /applications/student/:studentId
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "ApplicationId": 1,
    "JobId": 1,
    "ApplicationStatus": "Shortlisted"
  }
]
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input data",
  "details": {"field": "email", "message": "Invalid email format"}
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```

## Role Values
- 1: Student
- 2: Employer
- 3: Administrator

## Application Status Values
- Submitted
- Under Review
- Shortlisted
- Rejected
- Accepted

## Civil Domains
- Structural Engineering
- Geotechnical Engineering
- Transportation Engineering
- Environmental Engineering
- Water Resources Engineering
- Construction Engineering
- Hydraulics Engineering
- Urban Planning
