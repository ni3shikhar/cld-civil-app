-- Contoso Civil App - SQL Server Database Schema
-- Civil Engineering Job Management Platform

-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ContosoCivilApp')
  CREATE DATABASE ContosoCivilApp;
GO

USE ContosoCivilApp;
GO

-- 1. CREATE UserRoles TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserRoles]') AND type in (N'U'))
BEGIN
  CREATE TABLE UserRoles (
    RoleId INT PRIMARY KEY IDENTITY(1,1),
    RoleName VARCHAR(50) NOT NULL UNIQUE,
    Description VARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE()
  );
  
  INSERT INTO UserRoles (RoleName, Description) VALUES
    ('Student', 'Student persona - can view jobs, apply, and access learning resources'),
    ('Employer', 'Employer persona - can post jobs and manage applications'),
    ('Administrator', 'Platform administrator - manages content and users');
END
GO

-- 2. CREATE Users TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
  CREATE TABLE Users (
    UserId INT PRIMARY KEY IDENTITY(1,1),
    Email VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(MAX) NOT NULL,
    FirstName VARCHAR(100) NOT NULL,
    LastName VARCHAR(100) NOT NULL,
    PhoneNumber VARCHAR(20),
    RoleId INT NOT NULL,
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RoleId) REFERENCES UserRoles(RoleId)
  );
  
  CREATE INDEX idx_users_email ON Users(Email);
  CREATE INDEX idx_users_role ON Users(RoleId);
END
GO

-- 3. CREATE StudentProfiles TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudentProfiles]') AND type in (N'U'))
BEGIN
  CREATE TABLE StudentProfiles (
    StudentId INT PRIMARY KEY,
    UserId INT NOT NULL UNIQUE,
    UniversityName VARCHAR(255),
    Specialization VARCHAR(100),
    GraduationYear INT,
    CGPA DECIMAL(3,2),
    ResumeBlobName VARCHAR(500),
    ResumeFileName VARCHAR(255),
    Bio TEXT,
    Skills VARCHAR(MAX),
    PhoneNumber VARCHAR(20),
    StreetAddress VARCHAR(255),
    City VARCHAR(100),
    State VARCHAR(100),
    ZipCode VARCHAR(20),
    Country VARCHAR(100) DEFAULT 'United States',
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
  );
  
  CREATE INDEX idx_student_user ON StudentProfiles(UserId);
END
GO

-- 4. CREATE EmployerProfiles TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EmployerProfiles]') AND type in (N'U'))
BEGIN
  CREATE TABLE EmployerProfiles (
    EmployerId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL UNIQUE,
    CompanyName VARCHAR(255) NOT NULL,
    CompanyRegistration VARCHAR(100),
    IndustryType VARCHAR(100),
    CompanySize VARCHAR(50),
    Website VARCHAR(255),
    Address VARCHAR(MAX),
    City VARCHAR(100),
    State VARCHAR(100),
    Country VARCHAR(100),
    ApprovalStatus VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
    IsVerified BIT DEFAULT 0,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
  );
  
  CREATE INDEX idx_employer_user ON EmployerProfiles(UserId);
END
GO

-- 5. CREATE JobRequisitions TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[JobRequisitions]') AND type in (N'U'))
BEGIN
  CREATE TABLE JobRequisitions (
    JobId INT PRIMARY KEY IDENTITY(1,1),
    EmployerId INT NOT NULL,
    JobTitle VARCHAR(255) NOT NULL,
    JobDescription TEXT NOT NULL,
    RequiredSkills VARCHAR(MAX),
    CivilDomain VARCHAR(100), -- e.g., Structural, Geotechnical, Transportation, etc.
    RequiredExperience INT, -- years
    MinimumQualification VARCHAR(100),
    Salary DECIMAL(10,2),
    NumberOfOpenings INT DEFAULT 1,
    JobLocation VARCHAR(255),
    JobType VARCHAR(50), -- Full-time, Part-time, Contract, Internship
    ApprovalStatus VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
    PostingDate DATETIME DEFAULT GETDATE(),
    ExpirationDate DATETIME,
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId)
  );
  
  CREATE INDEX idx_job_employer ON JobRequisitions(EmployerId);
  CREATE INDEX idx_job_active ON JobRequisitions(IsActive);
  CREATE INDEX idx_job_domain ON JobRequisitions(CivilDomain);
END
GO

-- 6. CREATE JobApplications TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[JobApplications]') AND type in (N'U'))
BEGIN
  CREATE TABLE JobApplications (
    ApplicationId INT PRIMARY KEY IDENTITY(1,1),
    JobId INT NOT NULL,
    StudentId INT NOT NULL,
    UserId INT NOT NULL,
    CoverLetter TEXT,
    ApplicationStatus VARCHAR(50) DEFAULT 'Submitted', -- Submitted, Under Review, Shortlisted, Rejected, Accepted
    AppliedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    ReviewedBy INT, -- UserId of reviewer (Employer)
    ReviewDate DATETIME,
    FinalOutcome VARCHAR(50), -- Selected, Rejected, Hold
    FOREIGN KEY (JobId) REFERENCES JobRequisitions(JobId),
    FOREIGN KEY (StudentId) REFERENCES StudentProfiles(StudentId),
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (ReviewedBy) REFERENCES Users(UserId)
  );
  
  CREATE INDEX idx_app_student ON JobApplications(StudentId);
  CREATE INDEX idx_app_job ON JobApplications(JobId);
  CREATE INDEX idx_app_status ON JobApplications(ApplicationStatus);
END
GO

-- 7. CREATE InterviewQuestions TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[InterviewQuestions]') AND type in (N'U'))
BEGIN
  CREATE TABLE InterviewQuestions (
    QuestionId INT PRIMARY KEY IDENTITY(1,1),
    CreatedBy INT NOT NULL, -- Admin UserId
    CivilDomain VARCHAR(100) NOT NULL, -- Structural, Geotechnical, Transportation, etc.
    QuestionCategory VARCHAR(100), -- Conceptual, Practical, Behavioral
    QuestionText TEXT NOT NULL,
    CorrectAnswer TEXT,
    Explanation TEXT,
    DifficultyLevel VARCHAR(50), -- Easy, Medium, Hard
    MarksTotal INT DEFAULT 5,
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
  );
  
  CREATE INDEX idx_question_domain ON InterviewQuestions(CivilDomain);
  CREATE INDEX idx_question_difficulty ON InterviewQuestions(DifficultyLevel);
END
GO

-- 8. CREATE InterviewAssessments TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[InterviewAssessments]') AND type in (N'U'))
BEGIN
  CREATE TABLE InterviewAssessments (
    AssessmentId INT PRIMARY KEY IDENTITY(1,1),
    ApplicationId INT NOT NULL,
    StudentId INT NOT NULL,
    CivilDomain VARCHAR(100),
    TotalQuestions INT,
    TotalMarks INT,
    ObtainedMarks DECIMAL(5,2),
    PassingMarks DECIMAL(5,2),
    AssessmentStatus VARCHAR(50) DEFAULT 'Pending', -- Pending, In Progress, Completed
    StartedDate DATETIME,
    CompletedDate DATETIME,
    CreatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ApplicationId) REFERENCES JobApplications(ApplicationId),
    FOREIGN KEY (StudentId) REFERENCES StudentProfiles(StudentId)
  );
  
  CREATE INDEX idx_assessment_application ON InterviewAssessments(ApplicationId);
  CREATE INDEX idx_assessment_student ON InterviewAssessments(StudentId);
END
GO

-- 9. CREATE KnowledgeArticles TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[KnowledgeArticles]') AND type in (N'U'))
BEGIN
  CREATE TABLE KnowledgeArticles (
    ArticleId INT PRIMARY KEY IDENTITY(1,1),
    CreatedBy INT NOT NULL, -- Admin UserId
    CivilDomain VARCHAR(100) NOT NULL,
    Title VARCHAR(255) NOT NULL,
    Content TEXT NOT NULL,
    Keywords VARCHAR(MAX),
    IsPublished BIT DEFAULT 1,
    ViewCount INT DEFAULT 0,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
  );
  
  CREATE INDEX idx_article_domain ON KnowledgeArticles(CivilDomain);
  CREATE INDEX idx_article_published ON KnowledgeArticles(IsPublished);
END
GO

-- 10. CREATE Audit TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Audit]') AND type in (N'U'))
BEGIN
  CREATE TABLE Audit (
    AuditId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT,
    Action VARCHAR(255),
    EntityType VARCHAR(100),
    EntityId INT,
    OldValue VARCHAR(MAX),
    NewValue VARCHAR(MAX),
    Timestamp DATETIME DEFAULT GETDATE(),
    IPAddress VARCHAR(50),
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
  );
  
  CREATE INDEX idx_audit_user ON Audit(UserId);
  CREATE INDEX idx_audit_entity ON Audit(EntityType, EntityId);
  CREATE INDEX idx_audit_timestamp ON Audit(Timestamp);
END
GO

-- 11. CREATE QuestionOptions TABLE (for MCQ support)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QuestionOptions]') AND type in (N'U'))
BEGIN
  CREATE TABLE QuestionOptions (
    OptionId INT PRIMARY KEY IDENTITY(1,1),
    QuestionId INT NOT NULL,
    OptionText TEXT NOT NULL,
    OptionIndex INT, -- A, B, C, D
    IsCorrect BIT DEFAULT 0,
    FOREIGN KEY (QuestionId) REFERENCES InterviewQuestions(QuestionId) ON DELETE CASCADE
  );
  
  CREATE INDEX idx_option_question ON QuestionOptions(QuestionId);
END
GO

-- 12. CREATE StudentResponses TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudentResponses]') AND type in (N'U'))
BEGIN
  CREATE TABLE StudentResponses (
    ResponseId INT PRIMARY KEY IDENTITY(1,1),
    AssessmentId INT NOT NULL,
    QuestionId INT NOT NULL,
    StudentId INT NOT NULL,
    SelectedOption INT, -- OptionId for MCQ
    TextResponse TEXT, -- For subjective questions
    MarksObtained DECIMAL(5,2),
    IsCorrect BIT,
    AnsweredDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (AssessmentId) REFERENCES InterviewAssessments(AssessmentId),
    FOREIGN KEY (QuestionId) REFERENCES InterviewQuestions(QuestionId),
    FOREIGN KEY (StudentId) REFERENCES StudentProfiles(StudentId)
  );
  
  CREATE INDEX idx_response_assessment ON StudentResponses(AssessmentId);
  CREATE INDEX idx_response_student ON StudentResponses(StudentId);
END
GO

-- Create views for common queries
-- Note: DROP and CREATE pattern used because CREATE VIEW cannot be inside IF...BEGIN block

-- View: Student Job Applications Summary
DROP VIEW IF EXISTS vw_StudentApplications;
GO

CREATE VIEW vw_StudentApplications AS
SELECT 
  ja.ApplicationId,
  ja.AppliedDate,
  ja.ApplicationStatus,
  jr.JobTitle,
  jr.CivilDomain,
  ep.CompanyName,
  ep.City,
  ja.FinalOutcome
FROM JobApplications ja
JOIN JobRequisitions jr ON ja.JobId = jr.JobId
JOIN EmployerProfiles ep ON jr.EmployerId = ep.EmployerId;
GO

-- View: Employer Job Postings Summary
DROP VIEW IF EXISTS vw_EmployerJobs;
GO

CREATE VIEW vw_EmployerJobs AS
SELECT 
  jr.JobId,
  jr.JobTitle,
  jr.CivilDomain,
  jr.ApprovalStatus,
  COUNT(ja.ApplicationId) as ApplicationCount,
  jr.PostingDate,
  jr.ExpirationDate
FROM JobRequisitions jr
LEFT JOIN JobApplications ja ON jr.JobId = ja.JobId
GROUP BY jr.JobId, jr.JobTitle, jr.CivilDomain, jr.ApprovalStatus, jr.PostingDate, jr.ExpirationDate;
GO

PRINT 'Database schema created successfully!';
