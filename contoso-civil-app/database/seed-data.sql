-- Seed Data for Contoso Civil App

USE ContosoCivilApp;
GO

-- Insert sample employer user (password: employer123)
IF NOT EXISTS (SELECT * FROM Users WHERE Email = 'employer@acmecivil.com')
BEGIN
  INSERT INTO Users (Email, PasswordHash, FirstName, LastName, RoleId)
  VALUES ('employer@acmecivil.com', '$2a$10$XKKHjQWKlVKlLkVkLkVkLeVkLkVkLkVkLkVkLkVkLkVkLkVkLkVkLk', 'John', 'Smith', 2);
END
GO

-- Insert employer profile
DECLARE @EmployerUserId INT;
SELECT @EmployerUserId = UserId FROM Users WHERE Email = 'employer@acmecivil.com';

IF @EmployerUserId IS NOT NULL AND NOT EXISTS (SELECT * FROM EmployerProfiles WHERE UserId = @EmployerUserId)
BEGIN
  INSERT INTO EmployerProfiles (UserId, CompanyName, IndustryType, CompanySize, Website, City, State, Country, ApprovalStatus, IsVerified)
  VALUES (@EmployerUserId, 'ACME Civil Engineering', 'Construction', '100-500', 'https://acmecivil.com', 'Austin', 'Texas', 'USA', 'Approved', 1);
END
GO

-- Insert sample job requisitions
DECLARE @EmployerId INT;
SELECT @EmployerId = ep.EmployerId FROM EmployerProfiles ep 
  JOIN Users u ON ep.UserId = u.UserId 
  WHERE u.Email = 'employer@acmecivil.com';

IF @EmployerId IS NOT NULL
BEGIN
  -- Job 1: Structural Engineer
  IF NOT EXISTS (SELECT * FROM JobRequisitions WHERE JobTitle = 'Structural Engineer - Bridge Design')
  BEGIN
    INSERT INTO JobRequisitions (EmployerId, JobTitle, JobDescription, RequiredSkills, CivilDomain, RequiredExperience, MinimumQualification, Salary, NumberOfOpenings, JobLocation, JobType, ApprovalStatus, ExpirationDate, IsActive)
    VALUES (@EmployerId, 
      'Structural Engineer - Bridge Design',
      'We are seeking an experienced Structural Engineer to join our Bridge Design team. You will be responsible for designing and analyzing bridge structures, preparing structural calculations, and coordinating with project teams.',
      'AutoCAD, SAP2000, STAAD Pro, AASHTO LRFD, Structural Analysis, Bridge Design',
      'Structural',
      3,
      'Bachelor''s in Civil Engineering',
      85000.00,
      2,
      'Austin, TX',
      'Full-time',
      'Approved',
      DATEADD(MONTH, 3, GETDATE()),
      1);
  END

  -- Job 2: Geotechnical Engineer
  IF NOT EXISTS (SELECT * FROM JobRequisitions WHERE JobTitle = 'Geotechnical Engineer')
  BEGIN
    INSERT INTO JobRequisitions (EmployerId, JobTitle, JobDescription, RequiredSkills, CivilDomain, RequiredExperience, MinimumQualification, Salary, NumberOfOpenings, JobLocation, JobType, ApprovalStatus, ExpirationDate, IsActive)
    VALUES (@EmployerId,
      'Geotechnical Engineer',
      'Join our Geotechnical team to conduct soil investigations, foundation design, and slope stability analysis. You will work on diverse projects including commercial buildings, highways, and infrastructure.',
      'GeoStudio, PLAXIS, Soil Mechanics, Foundation Design, Slope Stability',
      'Geotechnical',
      2,
      'Bachelor''s in Civil/Geotechnical Engineering',
      75000.00,
      1,
      'Houston, TX',
      'Full-time',
      'Approved',
      DATEADD(MONTH, 2, GETDATE()),
      1);
  END

  -- Job 3: Transportation Engineer
  IF NOT EXISTS (SELECT * FROM JobRequisitions WHERE JobTitle = 'Transportation Engineer - Traffic Analysis')
  BEGIN
    INSERT INTO JobRequisitions (EmployerId, JobTitle, JobDescription, RequiredSkills, CivilDomain, RequiredExperience, MinimumQualification, Salary, NumberOfOpenings, JobLocation, JobType, ApprovalStatus, ExpirationDate, IsActive)
    VALUES (@EmployerId,
      'Transportation Engineer - Traffic Analysis',
      'Looking for a Transportation Engineer to perform traffic impact studies, roadway design, and transportation planning. Knowledge of MUTCD and Highway Capacity Manual is required.',
      'Synchro, VISSIM, HCS, AutoCAD Civil 3D, Traffic Analysis, MUTCD',
      'Transportation',
      2,
      'Bachelor''s in Civil Engineering',
      72000.00,
      2,
      'Dallas, TX',
      'Full-time',
      'Approved',
      DATEADD(MONTH, 2, GETDATE()),
      1);
  END

  -- Job 4: Construction Project Engineer
  IF NOT EXISTS (SELECT * FROM JobRequisitions WHERE JobTitle = 'Construction Project Engineer')
  BEGIN
    INSERT INTO JobRequisitions (EmployerId, JobTitle, JobDescription, RequiredSkills, CivilDomain, RequiredExperience, MinimumQualification, Salary, NumberOfOpenings, JobLocation, JobType, ApprovalStatus, ExpirationDate, IsActive)
    VALUES (@EmployerId,
      'Construction Project Engineer',
      'Seeking a Project Engineer to oversee construction projects from planning to completion. Responsibilities include project scheduling, cost management, quality control, and site supervision.',
      'Primavera P6, MS Project, Cost Estimation, Quality Control, Site Management',
      'Construction',
      4,
      'Bachelor''s in Civil Engineering',
      90000.00,
      1,
      'San Antonio, TX',
      'Full-time',
      'Approved',
      DATEADD(MONTH, 1, GETDATE()),
      1);
  END

  -- Job 5: Water Resources Engineer
  IF NOT EXISTS (SELECT * FROM JobRequisitions WHERE JobTitle = 'Water Resources Engineer')
  BEGIN
    INSERT INTO JobRequisitions (EmployerId, JobTitle, JobDescription, RequiredSkills, CivilDomain, RequiredExperience, MinimumQualification, Salary, NumberOfOpenings, JobLocation, JobType, ApprovalStatus, ExpirationDate, IsActive)
    VALUES (@EmployerId,
      'Water Resources Engineer',
      'Join our Water Resources team to design stormwater management systems, flood control measures, and drainage infrastructure. You will conduct hydrologic and hydraulic modeling.',
      'HEC-RAS, HEC-HMS, StormCAD, AutoCAD Civil 3D, Hydrology, Hydraulics',
      'Water Resources',
      3,
      'Bachelor''s in Civil/Environmental Engineering',
      78000.00,
      2,
      'Austin, TX',
      'Full-time',
      'Approved',
      DATEADD(MONTH, 2, GETDATE()),
      1);
  END

  -- Job 6: Civil Engineering Intern
  IF NOT EXISTS (SELECT * FROM JobRequisitions WHERE JobTitle = 'Civil Engineering Intern - Summer 2026')
  BEGIN
    INSERT INTO JobRequisitions (EmployerId, JobTitle, JobDescription, RequiredSkills, CivilDomain, RequiredExperience, MinimumQualification, Salary, NumberOfOpenings, JobLocation, JobType, ApprovalStatus, ExpirationDate, IsActive)
    VALUES (@EmployerId,
      'Civil Engineering Intern - Summer 2026',
      'Summer internship opportunity for civil engineering students. Gain hands-on experience working alongside experienced engineers on real projects.',
      'AutoCAD, Microsoft Office, Basic Engineering Principles, Teamwork',
      'General',
      0,
      'Pursuing Bachelor''s in Civil Engineering',
      25.00,
      5,
      'Multiple Locations, TX',
      'Internship',
      'Approved',
      DATEADD(MONTH, 4, GETDATE()),
      1);
  END
END
GO

-- Insert Civil Domain Interview Questions
-- ...existing code...
