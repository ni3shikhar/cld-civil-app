-- Migration: Rate Analysis Job Costing Feature
-- Date: 2026-02-13
-- Description: Adds tables for material rates, labor rates, machinery rates, and user job costing

-- =============================================
-- 1. MATERIAL RATES (Admin Configurable)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateMaterials]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateMaterials (
    MaterialId INT PRIMARY KEY IDENTITY(1,1),
    MaterialCode VARCHAR(50) NOT NULL UNIQUE,
    MaterialName VARCHAR(255) NOT NULL,
    Description VARCHAR(500),
    Unit VARCHAR(50) NOT NULL, -- kg, cum, sqm, nos, litre, bag, etc.
    UnitRate DECIMAL(18,2) NOT NULL DEFAULT 0,
    CategoryId INT,
    SupplierInfo VARCHAR(255),
    IsActive BIT DEFAULT 1,
    EffectiveDate DATE DEFAULT GETDATE(),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    CreatedBy INT,
    FOREIGN KEY (CategoryId) REFERENCES RateAnalysisCategories(CategoryId),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
  );

  CREATE INDEX idx_materials_code ON RateMaterials(MaterialCode);
  CREATE INDEX idx_materials_category ON RateMaterials(CategoryId);

  -- Insert sample materials
  INSERT INTO RateMaterials (MaterialCode, MaterialName, Description, Unit, UnitRate, CategoryId) VALUES
    ('MAT-CEM-OPC', 'OPC Cement 53 Grade', 'Ordinary Portland Cement 53 Grade per bag', 'bag', 380.00, 2),
    ('MAT-CEM-PPC', 'PPC Cement', 'Portland Pozzolana Cement per bag', 'bag', 360.00, 2),
    ('MAT-SAND-RIV', 'River Sand', 'Fine aggregate river sand', 'cum', 2800.00, 2),
    ('MAT-SAND-MFG', 'M-Sand', 'Manufactured sand', 'cum', 2200.00, 2),
    ('MAT-AGG-20', 'Aggregate 20mm', 'Coarse aggregate 20mm size', 'cum', 1800.00, 2),
    ('MAT-AGG-12', 'Aggregate 12mm', 'Coarse aggregate 12mm size', 'cum', 1900.00, 2),
    ('MAT-STEEL-TOR', 'TMT Steel Bars', 'TMT reinforcement bars Fe500D', 'kg', 65.00, 4),
    ('MAT-STEEL-STR', 'Structural Steel', 'Structural steel sections', 'kg', 72.00, 4),
    ('MAT-BRICK-1ST', 'First Class Bricks', 'First class burnt clay bricks', 'nos', 8.50, 3),
    ('MAT-BRICK-AAC', 'AAC Blocks', 'Autoclaved aerated concrete blocks', 'nos', 55.00, 3),
    ('MAT-WATER', 'Water', 'Water for construction', 'litre', 0.05, 2),
    ('MAT-BIT-VG30', 'Bitumen VG-30', 'Viscosity grade bitumen VG-30', 'kg', 58.00, 10),
    ('MAT-BIT-EMUL', 'Bitumen Emulsion', 'Bitumen emulsion for tack coat', 'litre', 48.00, 10),
    ('MAT-WBM-AGG', 'WBM Aggregate', 'Water bound macadam aggregate', 'cum', 1600.00, 10),
    ('MAT-PAINT-INT', 'Interior Emulsion', 'Acrylic interior emulsion paint', 'litre', 280.00, 9),
    ('MAT-PAINT-EXT', 'Exterior Emulsion', 'Weather proof exterior paint', 'litre', 350.00, 9),
    ('MAT-TILE-VIT', 'Vitrified Tiles', 'Vitrified floor tiles 600x600', 'sqm', 650.00, 7),
    ('MAT-TILE-CER', 'Ceramic Tiles', 'Ceramic wall/floor tiles', 'sqm', 320.00, 7),
    ('MAT-PIPE-CPVC', 'CPVC Pipe 20mm', 'CPVC pipe 20mm diameter', 'rm', 65.00, 5),
    ('MAT-PIPE-PVC', 'PVC Pipe 110mm', 'PVC drainage pipe 110mm', 'rm', 140.00, 5);
END
GO

-- =============================================
-- 2. LABOR RATES (Admin Configurable)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateLabor]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateLabor (
    LaborId INT PRIMARY KEY IDENTITY(1,1),
    LaborCode VARCHAR(50) NOT NULL UNIQUE,
    LaborType VARCHAR(255) NOT NULL,
    Description VARCHAR(500),
    SkillLevel VARCHAR(50), -- Unskilled, Semi-skilled, Skilled, Highly-skilled
    Unit VARCHAR(50) NOT NULL DEFAULT 'day', -- day, hour, shift
    UnitRate DECIMAL(18,2) NOT NULL DEFAULT 0,
    OvertimeRate DECIMAL(18,2) DEFAULT 0,
    CategoryId INT,
    IsActive BIT DEFAULT 1,
    EffectiveDate DATE DEFAULT GETDATE(),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    CreatedBy INT,
    FOREIGN KEY (CategoryId) REFERENCES RateAnalysisCategories(CategoryId),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
  );

  CREATE INDEX idx_labor_code ON RateLabor(LaborCode);
  CREATE INDEX idx_labor_skill ON RateLabor(SkillLevel);

  -- Insert sample labor rates
  INSERT INTO RateLabor (LaborCode, LaborType, Description, SkillLevel, Unit, UnitRate, OvertimeRate) VALUES
    ('LAB-MASON', 'Mason', 'Skilled brick/block mason', 'Skilled', 'day', 850.00, 106.25),
    ('LAB-HELPER', 'Helper/Beldar', 'Unskilled labor helper', 'Unskilled', 'day', 550.00, 68.75),
    ('LAB-CARPENTER', 'Carpenter', 'Skilled carpenter for formwork', 'Skilled', 'day', 800.00, 100.00),
    ('LAB-BARBENDER', 'Bar Bender', 'Skilled reinforcement bar bender', 'Skilled', 'day', 750.00, 93.75),
    ('LAB-PLUMBER', 'Plumber', 'Skilled plumber', 'Skilled', 'day', 800.00, 100.00),
    ('LAB-ELECTRICIAN', 'Electrician', 'Skilled electrician', 'Skilled', 'day', 850.00, 106.25),
    ('LAB-PAINTER', 'Painter', 'Skilled painter', 'Skilled', 'day', 700.00, 87.50),
    ('LAB-WELDER', 'Welder', 'Skilled welder', 'Highly-skilled', 'day', 900.00, 112.50),
    ('LAB-OPERATOR-HE', 'Heavy Equipment Operator', 'Operator for JCB, excavator', 'Highly-skilled', 'day', 1000.00, 125.00),
    ('LAB-OPERATOR-LE', 'Light Equipment Operator', 'Operator for mixer, vibrator', 'Semi-skilled', 'day', 650.00, 81.25),
    ('LAB-SUPERVISOR', 'Site Supervisor', 'Construction site supervisor', 'Highly-skilled', 'day', 1200.00, 150.00),
    ('LAB-FOREMAN', 'Foreman', 'Work gang foreman', 'Skilled', 'day', 950.00, 118.75),
    ('LAB-TILEFIX', 'Tile Fixer', 'Skilled tile fixing mason', 'Skilled', 'day', 800.00, 100.00),
    ('LAB-ROADWORK', 'Road Worker', 'Semi-skilled road construction worker', 'Semi-skilled', 'day', 600.00, 75.00);
END
GO

-- =============================================
-- 3. MACHINERY/EQUIPMENT RATES (Admin Configurable)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateMachinery]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateMachinery (
    MachineryId INT PRIMARY KEY IDENTITY(1,1),
    MachineryCode VARCHAR(50) NOT NULL UNIQUE,
    MachineryName VARCHAR(255) NOT NULL,
    Description VARCHAR(500),
    MachineryType VARCHAR(100), -- Excavator, Mixer, Crane, Compactor, etc.
    Capacity VARCHAR(100), -- 0.9 cum, 10T, 480L, etc.
    Unit VARCHAR(50) NOT NULL DEFAULT 'hour', -- hour, day, trip, shift
    UnitRate DECIMAL(18,2) NOT NULL DEFAULT 0,
    FuelIncluded BIT DEFAULT 1,
    OperatorIncluded BIT DEFAULT 0,
    CategoryId INT,
    IsActive BIT DEFAULT 1,
    EffectiveDate DATE DEFAULT GETDATE(),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    CreatedBy INT,
    FOREIGN KEY (CategoryId) REFERENCES RateAnalysisCategories(CategoryId),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
  );

  CREATE INDEX idx_machinery_code ON RateMachinery(MachineryCode);
  CREATE INDEX idx_machinery_type ON RateMachinery(MachineryType);

  -- Insert sample machinery rates
  INSERT INTO RateMachinery (MachineryCode, MachineryName, Description, MachineryType, Capacity, Unit, UnitRate, FuelIncluded, OperatorIncluded) VALUES
    ('MCH-EXCAVATOR', 'Hydraulic Excavator', 'JCB/Excavator for excavation', 'Excavator', '0.9 cum bucket', 'hour', 1800.00, 1, 0),
    ('MCH-LOADER', 'Wheel Loader', 'Front end wheel loader', 'Loader', '2.0 cum bucket', 'hour', 1500.00, 1, 0),
    ('MCH-MIXER', 'Concrete Mixer', 'Concrete mixer machine', 'Mixer', '480 litre', 'day', 1200.00, 0, 0),
    ('MCH-VIBRATOR', 'Needle Vibrator', 'Concrete needle vibrator', 'Vibrator', '40mm dia', 'day', 400.00, 0, 0),
    ('MCH-BATCHING', 'Batching Plant', 'Concrete batching plant', 'Batching', '30 cum/hr', 'hour', 3500.00, 1, 1),
    ('MCH-TRANSIT', 'Transit Mixer', 'Concrete transit mixer truck', 'Transit Mixer', '6 cum', 'trip', 2500.00, 1, 1),
    ('MCH-PUMP', 'Concrete Pump', 'Concrete pump machine', 'Pump', '60 cum/hr', 'hour', 4000.00, 1, 1),
    ('MCH-CRANE-MOB', 'Mobile Crane', 'Mobile crane for lifting', 'Crane', '20 ton', 'day', 18000.00, 1, 1),
    ('MCH-CRANE-TWR', 'Tower Crane', 'Tower crane for high rise', 'Crane', '8 ton', 'month', 250000.00, 0, 0),
    ('MCH-ROLLER-VIB', 'Vibratory Roller', 'Vibratory road roller', 'Compactor', '10 ton', 'hour', 1400.00, 1, 0),
    ('MCH-ROLLER-STAT', 'Static Roller', 'Static road roller', 'Compactor', '8 ton', 'hour', 1100.00, 1, 0),
    ('MCH-PAVER', 'Asphalt Paver', 'Asphalt paving machine', 'Paver', '4.5m width', 'day', 25000.00, 1, 1),
    ('MCH-TIPPER', 'Tipper Truck', 'Tipper for material transport', 'Transport', '10 cum', 'trip', 800.00, 1, 1),
    ('MCH-COMPRESSOR', 'Air Compressor', 'Portable air compressor', 'Compressor', '250 CFM', 'hour', 600.00, 1, 0),
    ('MCH-WELDING', 'Welding Machine', 'Electric welding machine', 'Welding', '400 Amp', 'day', 500.00, 0, 0),
    ('MCH-PUMP-DEWATER', 'Dewatering Pump', 'Submersible dewatering pump', 'Pump', '5 HP', 'hour', 250.00, 0, 0);
END
GO

-- =============================================
-- 4. COMPOSITE RATE ITEMS (Admin Creates Using Base Rates)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateCompositeItems]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateCompositeItems (
    CompositeItemId INT PRIMARY KEY IDENTITY(1,1),
    ItemCode VARCHAR(50) NOT NULL UNIQUE,
    ItemName VARCHAR(255) NOT NULL,
    Description VARCHAR(MAX),
    Unit VARCHAR(50) NOT NULL, -- cum, sqm, rm, kg, nos, etc.
    CategoryId INT,
    CivilDomain VARCHAR(100),
    -- Calculated totals (updated when components change)
    MaterialCost DECIMAL(18,2) DEFAULT 0,
    LaborCost DECIMAL(18,2) DEFAULT 0,
    MachineryCost DECIMAL(18,2) DEFAULT 0,
    OverheadPercent DECIMAL(5,2) DEFAULT 10.00, -- Contractor overhead %
    TotalRate DECIMAL(18,2) DEFAULT 0,
    IsActive BIT DEFAULT 1,
    EffectiveDate DATE DEFAULT GETDATE(),
    Notes VARCHAR(MAX),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    CreatedBy INT,
    FOREIGN KEY (CategoryId) REFERENCES RateAnalysisCategories(CategoryId),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
  );

  CREATE INDEX idx_composite_code ON RateCompositeItems(ItemCode);
  CREATE INDEX idx_composite_category ON RateCompositeItems(CategoryId);
END
GO

-- =============================================
-- 5. COMPOSITE ITEM COMPONENTS (Links items to base rates)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateCompositeComponents]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateCompositeComponents (
    ComponentId INT PRIMARY KEY IDENTITY(1,1),
    CompositeItemId INT NOT NULL,
    ComponentType VARCHAR(20) NOT NULL, -- 'Material', 'Labor', 'Machinery'
    ReferenceId INT NOT NULL, -- MaterialId, LaborId, or MachineryId
    Quantity DECIMAL(18,4) NOT NULL DEFAULT 1,
    WastagePercent DECIMAL(5,2) DEFAULT 0, -- For materials
    Notes VARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CompositeItemId) REFERENCES RateCompositeItems(CompositeItemId) ON DELETE CASCADE
  );

  CREATE INDEX idx_comp_composite ON RateCompositeComponents(CompositeItemId);
  CREATE INDEX idx_comp_type ON RateCompositeComponents(ComponentType);
END
GO

-- =============================================
-- 6. USER JOBS (Subscribed Users Create Jobs)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateUserJobs]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateUserJobs (
    JobId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    JobName VARCHAR(255) NOT NULL,
    JobDescription VARCHAR(MAX),
    ClientName VARCHAR(255),
    ProjectLocation VARCHAR(255),
    Status VARCHAR(50) DEFAULT 'Draft', -- Draft, Active, Completed, Archived
    -- Calculated totals
    TotalMaterialCost DECIMAL(18,2) DEFAULT 0,
    TotalLaborCost DECIMAL(18,2) DEFAULT 0,
    TotalMachineryCost DECIMAL(18,2) DEFAULT 0,
    TotalOverheadCost DECIMAL(18,2) DEFAULT 0,
    GrandTotal DECIMAL(18,2) DEFAULT 0,
    -- Dates
    EstimatedStartDate DATE,
    EstimatedEndDate DATE,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
  );

  CREATE INDEX idx_jobs_user ON RateUserJobs(UserId);
  CREATE INDEX idx_jobs_status ON RateUserJobs(Status);
END
GO

-- =============================================
-- 7. JOB ITEMS (Items within a User's Job)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateUserJobItems]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateUserJobItems (
    JobItemId INT PRIMARY KEY IDENTITY(1,1),
    JobId INT NOT NULL,
    CompositeItemId INT NOT NULL,
    Quantity DECIMAL(18,4) NOT NULL DEFAULT 1,
    -- Calculated costs (based on quantity * composite item rates)
    CalculatedMaterialCost DECIMAL(18,2) DEFAULT 0,
    CalculatedLaborCost DECIMAL(18,2) DEFAULT 0,
    CalculatedMachineryCost DECIMAL(18,2) DEFAULT 0,
    CalculatedOverhead DECIMAL(18,2) DEFAULT 0,
    CalculatedTotal DECIMAL(18,2) DEFAULT 0,
    Notes VARCHAR(500),
    SortOrder INT DEFAULT 0,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (JobId) REFERENCES RateUserJobs(JobId) ON DELETE CASCADE,
    FOREIGN KEY (CompositeItemId) REFERENCES RateCompositeItems(CompositeItemId)
  );

  CREATE INDEX idx_jobitems_job ON RateUserJobItems(JobId);
END
GO

-- =============================================
-- 8. INSERT SAMPLE COMPOSITE ITEMS WITH COMPONENTS
-- =============================================
-- Sample RCC M20 item with components
DECLARE @compositeId INT;

IF NOT EXISTS (SELECT 1 FROM RateCompositeItems WHERE ItemCode = 'COMP-RCC-M20')
BEGIN
  INSERT INTO RateCompositeItems (ItemCode, ItemName, Description, Unit, CategoryId, CivilDomain, OverheadPercent)
  VALUES ('COMP-RCC-M20', 'RCC M20 Grade Concrete', 'Reinforced cement concrete M20 grade (1:1.5:3) including mixing, placing, compacting, curing. Excludes reinforcement.', 'cum', 2, 'Structural', 10);
  
  SET @compositeId = SCOPE_IDENTITY();
  
  -- Materials for 1 cum RCC M20
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
  SELECT @compositeId, 'Material', MaterialId, 8.5, 2, 'Cement - 8.5 bags per cum' FROM RateMaterials WHERE MaterialCode = 'MAT-CEM-OPC';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
  SELECT @compositeId, 'Material', MaterialId, 0.45, 5, 'River sand - 0.45 cum per cum' FROM RateMaterials WHERE MaterialCode = 'MAT-SAND-RIV';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
  SELECT @compositeId, 'Material', MaterialId, 0.9, 5, '20mm aggregate - 0.9 cum per cum' FROM RateMaterials WHERE MaterialCode = 'MAT-AGG-20';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
  SELECT @compositeId, 'Material', MaterialId, 180, 0, 'Water for mixing and curing' FROM RateMaterials WHERE MaterialCode = 'MAT-WATER';
  
  -- Labor for 1 cum RCC
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @compositeId, 'Labor', LaborId, 0.25, 'Mason - 0.25 day per cum' FROM RateLabor WHERE LaborCode = 'LAB-MASON';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @compositeId, 'Labor', LaborId, 1.5, 'Helpers - 1.5 days per cum' FROM RateLabor WHERE LaborCode = 'LAB-HELPER';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @compositeId, 'Labor', LaborId, 0.1, 'Vibrator operator' FROM RateLabor WHERE LaborCode = 'LAB-OPERATOR-LE';
  
  -- Machinery for 1 cum RCC
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @compositeId, 'Machinery', MachineryId, 0.05, 'Concrete mixer usage' FROM RateMachinery WHERE MachineryCode = 'MCH-MIXER';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @compositeId, 'Machinery', MachineryId, 0.05, 'Needle vibrator usage' FROM RateMachinery WHERE MachineryCode = 'MCH-VIBRATOR';
END
GO

-- Sample Brick Masonry item
IF NOT EXISTS (SELECT 1 FROM RateCompositeItems WHERE ItemCode = 'COMP-BRICK-CM16')
BEGIN
  DECLARE @brickId INT;
  
  INSERT INTO RateCompositeItems (ItemCode, ItemName, Description, Unit, CategoryId, CivilDomain, OverheadPercent)
  VALUES ('COMP-BRICK-CM16', 'Brick Masonry in CM 1:6', 'First class brick masonry in cement mortar 1:6, including all materials and labor', 'cum', 3, 'Structural', 10);
  
  SET @brickId = SCOPE_IDENTITY();
  
  -- Materials for 1 cum brick masonry
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
  SELECT @brickId, 'Material', MaterialId, 500, 5, 'Bricks - 500 nos per cum' FROM RateMaterials WHERE MaterialCode = 'MAT-BRICK-1ST';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
  SELECT @brickId, 'Material', MaterialId, 1.5, 2, 'Cement - 1.5 bags per cum' FROM RateMaterials WHERE MaterialCode = 'MAT-CEM-OPC';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
  SELECT @brickId, 'Material', MaterialId, 0.3, 5, 'Sand - 0.3 cum per cum' FROM RateMaterials WHERE MaterialCode = 'MAT-SAND-RIV';
  
  -- Labor
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @brickId, 'Labor', LaborId, 1.2, 'Mason - 1.2 days per cum' FROM RateLabor WHERE LaborCode = 'LAB-MASON';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @brickId, 'Labor', LaborId, 1.0, 'Helper - 1 day per cum' FROM RateLabor WHERE LaborCode = 'LAB-HELPER';
END
GO

-- Sample Road WBM item
IF NOT EXISTS (SELECT 1 FROM RateCompositeItems WHERE ItemCode = 'COMP-WBM-75')
BEGIN
  DECLARE @wbmId INT;
  
  INSERT INTO RateCompositeItems (ItemCode, ItemName, Description, Unit, CategoryId, CivilDomain, OverheadPercent)
  VALUES ('COMP-WBM-75', 'WBM Layer 75mm', 'Water bound macadam 75mm compacted thickness including all materials, spreading, watering and rolling', 'sqm', 10, 'Transportation', 12);
  
  SET @wbmId = SCOPE_IDENTITY();
  
  -- Materials
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
  SELECT @wbmId, 'Material', MaterialId, 0.09, 10, 'WBM aggregate - 0.09 cum per sqm' FROM RateMaterials WHERE MaterialCode = 'MAT-WBM-AGG';
  
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @wbmId, 'Material', MaterialId, 15, 'Water for compaction' FROM RateMaterials WHERE MaterialCode = 'MAT-WATER';
  
  -- Labor
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @wbmId, 'Labor', LaborId, 0.02, 'Road worker' FROM RateLabor WHERE LaborCode = 'LAB-ROADWORK';
  
  -- Machinery
  INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, Notes)
  SELECT @wbmId, 'Machinery', MachineryId, 0.01, 'Vibratory roller' FROM RateMachinery WHERE MachineryCode = 'MCH-ROLLER-VIB';
END
GO

PRINT 'Rate Analysis Job Costing migration completed successfully';
GO
