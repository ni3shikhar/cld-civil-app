-- Migration: Add phone and address fields to StudentProfiles
-- Date: 2026-02-10

-- Add PhoneNumber column if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentProfiles' AND COLUMN_NAME = 'PhoneNumber')
BEGIN
  ALTER TABLE StudentProfiles ADD PhoneNumber VARCHAR(20) NULL;
  PRINT 'Added PhoneNumber column';
END
GO

-- Add StreetAddress column if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentProfiles' AND COLUMN_NAME = 'StreetAddress')
BEGIN
  ALTER TABLE StudentProfiles ADD StreetAddress VARCHAR(255) NULL;
  PRINT 'Added StreetAddress column';
END
GO

-- Add City column if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentProfiles' AND COLUMN_NAME = 'City')
BEGIN
  ALTER TABLE StudentProfiles ADD City VARCHAR(100) NULL;
  PRINT 'Added City column';
END
GO

-- Add State column if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentProfiles' AND COLUMN_NAME = 'State')
BEGIN
  ALTER TABLE StudentProfiles ADD State VARCHAR(100) NULL;
  PRINT 'Added State column';
END
GO

-- Add ZipCode column if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentProfiles' AND COLUMN_NAME = 'ZipCode')
BEGIN
  ALTER TABLE StudentProfiles ADD ZipCode VARCHAR(20) NULL;
  PRINT 'Added ZipCode column';
END
GO

-- Add Country column if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentProfiles' AND COLUMN_NAME = 'Country')
BEGIN
  ALTER TABLE StudentProfiles ADD Country VARCHAR(100) NULL DEFAULT 'United States';
  PRINT 'Added Country column';
END
GO

PRINT 'Migration 002_add_student_contact_info completed successfully';
