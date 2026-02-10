-- Migration: Update StudentProfiles to use Azure Blob Storage for resumes
-- This replaces the Resume VARBINARY column with ResumeBlobName VARCHAR

-- Add new column for blob name if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[StudentProfiles]') AND name = 'ResumeBlobName')
BEGIN
  ALTER TABLE StudentProfiles ADD ResumeBlobName VARCHAR(500) NULL;
  PRINT 'Added ResumeBlobName column';
END
GO

-- Drop the old Resume binary column if it exists
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[StudentProfiles]') AND name = 'Resume')
BEGIN
  ALTER TABLE StudentProfiles DROP COLUMN Resume;
  PRINT 'Dropped Resume column';
END
GO

PRINT 'Migration completed: StudentProfiles now uses Azure Blob Storage for resumes';
