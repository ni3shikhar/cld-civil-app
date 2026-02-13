-- Migration: Add Rate Analysis Feature
-- Date: 2026-02-13
-- Description: Adds tables for rate analysis subscriptions, plans, categories, and items

-- 1. CREATE RateAnalysisPlans TABLE (Subscription Plans)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateAnalysisPlans]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateAnalysisPlans (
    PlanId INT PRIMARY KEY IDENTITY(1,1),
    PlanName VARCHAR(100) NOT NULL,
    Description VARCHAR(500),
    Price DECIMAL(10,2) NOT NULL DEFAULT 0,
    DurationDays INT NOT NULL DEFAULT 365,
    Features VARCHAR(MAX), -- JSON array of features
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
  );

  -- Insert default plans
  INSERT INTO RateAnalysisPlans (PlanName, Description, Price, DurationDays, Features) VALUES
    ('Free', 'Basic access to rate analysis data with limited features', 0, 365, '["View basic rates", "Search functionality", "Limited exports"]'),
    ('Professional', 'Full access to all rate analysis features', 49.99, 365, '["View all rates", "Advanced search", "Unlimited exports", "Historical data", "Custom reports"]'),
    ('Enterprise', 'Enterprise features with API access', 199.99, 365, '["All Professional features", "API access", "Bulk operations", "Priority support", "Custom integrations"]');
END
GO

-- 2. CREATE RateAnalysisSubscriptions TABLE (User Subscriptions)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateAnalysisSubscriptions]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateAnalysisSubscriptions (
    SubscriptionId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    PlanId INT NOT NULL,
    StartDate DATETIME NOT NULL DEFAULT GETDATE(),
    EndDate DATETIME NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Cancelled, Expired, Revoked, Superseded
    IsAdminEnabled BIT DEFAULT 1, -- Admin can disable access
    PaymentReference VARCHAR(255), -- For future payment integration
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    FOREIGN KEY (PlanId) REFERENCES RateAnalysisPlans(PlanId)
  );

  CREATE INDEX idx_rate_sub_user ON RateAnalysisSubscriptions(UserId);
  CREATE INDEX idx_rate_sub_status ON RateAnalysisSubscriptions(Status);
  CREATE INDEX idx_rate_sub_dates ON RateAnalysisSubscriptions(StartDate, EndDate);
END
GO

-- 3. CREATE RateAnalysisCategories TABLE
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateAnalysisCategories]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateAnalysisCategories (
    CategoryId INT PRIMARY KEY IDENTITY(1,1),
    CategoryName VARCHAR(100) NOT NULL,
    Description VARCHAR(500),
    ParentCategoryId INT NULL,
    SortOrder INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ParentCategoryId) REFERENCES RateAnalysisCategories(CategoryId)
  );

  -- Insert default civil engineering categories
  INSERT INTO RateAnalysisCategories (CategoryName, Description, SortOrder) VALUES
    ('Earthwork', 'Excavation, filling, grading, and site preparation', 1),
    ('Concrete Work', 'All types of concrete construction including RCC', 2),
    ('Masonry', 'Brick, block, and stone masonry work', 3),
    ('Structural Steel', 'Steel fabrication and erection', 4),
    ('Plumbing', 'Water supply and drainage systems', 5),
    ('Electrical', 'Electrical installations and wiring', 6),
    ('Flooring', 'All types of flooring materials and installation', 7),
    ('Roofing', 'Roof construction and waterproofing', 8),
    ('Painting', 'Interior and exterior painting work', 9),
    ('Road Work', 'Road construction and maintenance', 10),
    ('Bridge Work', 'Bridge construction components', 11),
    ('Water Resources', 'Irrigation and water management structures', 12);
END
GO

-- 4. CREATE RateAnalysisItems TABLE (Main rate data)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RateAnalysisItems]') AND type in (N'U'))
BEGIN
  CREATE TABLE RateAnalysisItems (
    RateItemId INT PRIMARY KEY IDENTITY(1,1),
    ItemCode VARCHAR(50) NOT NULL,
    ItemName VARCHAR(255) NOT NULL,
    Description VARCHAR(MAX),
    Unit VARCHAR(50) NOT NULL, -- cum, sqm, rm, kg, nos, etc.
    CategoryId INT,
    MaterialRate DECIMAL(18,2) DEFAULT 0,
    LaborRate DECIMAL(18,2) DEFAULT 0,
    EquipmentRate DECIMAL(18,2) DEFAULT 0,
    TotalRate DECIMAL(18,2) DEFAULT 0,
    CivilDomain VARCHAR(100), -- Structural, Geotechnical, Transportation, etc.
    EffectiveDate DATE DEFAULT GETDATE(),
    ExpiryDate DATE,
    Notes VARCHAR(MAX),
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    CreatedBy INT,
    FOREIGN KEY (CategoryId) REFERENCES RateAnalysisCategories(CategoryId),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
  );

  CREATE INDEX idx_rate_items_code ON RateAnalysisItems(ItemCode);
  CREATE INDEX idx_rate_items_category ON RateAnalysisItems(CategoryId);
  CREATE INDEX idx_rate_items_domain ON RateAnalysisItems(CivilDomain);
END
GO

-- 5. INSERT Sample Rate Analysis Data
IF NOT EXISTS (SELECT 1 FROM RateAnalysisItems)
BEGIN
  -- Earthwork Items
  INSERT INTO RateAnalysisItems (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain) VALUES
    ('EW-001', 'Excavation in Ordinary Soil', 'Excavation in ordinary soil including disposal within 50m lead', 'cum', 1, 0, 85.00, 45.00, 130.00, 'Geotechnical'),
    ('EW-002', 'Excavation in Hard Rock', 'Excavation in hard rock by blasting including disposal', 'cum', 1, 15.00, 120.00, 180.00, 315.00, 'Geotechnical'),
    ('EW-003', 'Backfilling with Selected Material', 'Backfilling with selected excavated material in layers with compaction', 'cum', 1, 25.00, 65.00, 35.00, 125.00, 'Geotechnical'),
    ('EW-004', 'Sand Filling', 'Filling with sand including compaction and watering', 'cum', 1, 850.00, 45.00, 25.00, 920.00, 'Geotechnical');

  -- Concrete Work Items
  INSERT INTO RateAnalysisItems (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain) VALUES
    ('CC-001', 'PCC 1:4:8', 'Plain cement concrete 1:4:8 mix in foundation', 'cum', 2, 3200.00, 450.00, 150.00, 3800.00, 'Structural'),
    ('CC-002', 'RCC M20', 'Reinforced cement concrete M20 grade excluding steel', 'cum', 2, 4500.00, 650.00, 250.00, 5400.00, 'Structural'),
    ('CC-003', 'RCC M25', 'Reinforced cement concrete M25 grade excluding steel', 'cum', 2, 4800.00, 650.00, 250.00, 5700.00, 'Structural'),
    ('CC-004', 'RCC M30', 'Reinforced cement concrete M30 grade excluding steel', 'cum', 2, 5200.00, 700.00, 280.00, 6180.00, 'Structural'),
    ('CC-005', 'Formwork for Foundations', 'Centering and shuttering for foundations including stripping', 'sqm', 2, 180.00, 120.00, 0, 300.00, 'Structural'),
    ('CC-006', 'Formwork for Columns', 'Centering and shuttering for columns including stripping', 'sqm', 2, 250.00, 180.00, 0, 430.00, 'Structural');

  -- Masonry Items
  INSERT INTO RateAnalysisItems (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain) VALUES
    ('MS-001', 'Brick Masonry in CM 1:6', 'First class brick masonry in cement mortar 1:6', 'cum', 3, 4200.00, 1200.00, 0, 5400.00, 'Structural'),
    ('MS-002', 'Brick Masonry in CM 1:4', 'First class brick masonry in cement mortar 1:4', 'cum', 3, 4500.00, 1200.00, 0, 5700.00, 'Structural'),
    ('MS-003', 'AAC Block Masonry', 'AAC block masonry 200mm thick in cement mortar', 'sqm', 3, 580.00, 180.00, 0, 760.00, 'Structural'),
    ('MS-004', 'Stone Masonry', 'Random rubble stone masonry in cement mortar 1:6', 'cum', 3, 3800.00, 1500.00, 0, 5300.00, 'Structural');

  -- Structural Steel Items
  INSERT INTO RateAnalysisItems (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain) VALUES
    ('SS-001', 'Structural Steel Fabrication', 'Fabrication of structural steel sections including cutting, drilling', 'kg', 4, 72.00, 8.00, 2.00, 82.00, 'Structural'),
    ('SS-002', 'Steel Erection', 'Erection of structural steel members at site', 'kg', 4, 0, 6.00, 4.00, 10.00, 'Structural'),
    ('SS-003', 'Reinforcement Steel', 'Steel reinforcement bars including cutting, bending, placing', 'kg', 4, 68.00, 7.00, 0, 75.00, 'Structural');

  -- Road Work Items
  INSERT INTO RateAnalysisItems (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain) VALUES
    ('RD-001', 'WBM Layer', 'Water bound macadam 75mm compacted thickness', 'sqm', 10, 180.00, 25.00, 45.00, 250.00, 'Transportation'),
    ('RD-002', 'Bituminous Macadam', 'Dense bituminous macadam 50mm compacted', 'sqm', 10, 420.00, 35.00, 85.00, 540.00, 'Transportation'),
    ('RD-003', 'Asphaltic Concrete', 'Asphaltic concrete wearing course 40mm thick', 'sqm', 10, 380.00, 30.00, 75.00, 485.00, 'Transportation'),
    ('RD-004', 'Cement Concrete Pavement', 'Cement concrete pavement M40 grade 200mm thick', 'sqm', 10, 950.00, 120.00, 180.00, 1250.00, 'Transportation');

  -- Plumbing Items
  INSERT INTO RateAnalysisItems (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain) VALUES
    ('PL-001', 'CPVC Pipe 20mm', 'Providing and fixing CPVC pipe 20mm diameter', 'rm', 5, 85.00, 35.00, 0, 120.00, 'Water Resources'),
    ('PL-002', 'CPVC Pipe 25mm', 'Providing and fixing CPVC pipe 25mm diameter', 'rm', 5, 110.00, 40.00, 0, 150.00, 'Water Resources'),
    ('PL-003', 'PVC Drainage Pipe 110mm', 'PVC drainage pipe 110mm diameter with fittings', 'rm', 5, 180.00, 55.00, 0, 235.00, 'Water Resources'),
    ('PL-004', 'Water Tank 1000L', 'Providing and fixing PVC water tank 1000 liters with accessories', 'nos', 5, 8500.00, 1200.00, 0, 9700.00, 'Water Resources');

  -- Flooring Items
  INSERT INTO RateAnalysisItems (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain) VALUES
    ('FL-001', 'Vitrified Tiles 600x600', 'Vitrified tiles 600x600mm fixed with cement mortar', 'sqm', 7, 850.00, 180.00, 0, 1030.00, 'Construction Management'),
    ('FL-002', 'Ceramic Tiles 300x300', 'Ceramic tiles 300x300mm for wall/floor', 'sqm', 7, 450.00, 150.00, 0, 600.00, 'Construction Management'),
    ('FL-003', 'Granite Flooring', 'Polished granite flooring 18mm thick', 'sqm', 7, 2200.00, 350.00, 0, 2550.00, 'Construction Management'),
    ('FL-004', 'IPS Flooring', 'Indian patent stone flooring 25mm thick', 'sqm', 7, 180.00, 120.00, 0, 300.00, 'Construction Management');

  -- Painting Items
  INSERT INTO RateAnalysisItems (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain) VALUES
    ('PT-001', 'Interior Emulsion Paint', 'Acrylic emulsion paint 2 coats on plastered surface', 'sqm', 9, 45.00, 35.00, 0, 80.00, 'Construction Management'),
    ('PT-002', 'Exterior Emulsion Paint', 'Weather shield exterior emulsion 2 coats', 'sqm', 9, 65.00, 40.00, 0, 105.00, 'Construction Management'),
    ('PT-003', 'Enamel Paint on Metal', 'Synthetic enamel paint 2 coats on metal surface', 'sqm', 9, 55.00, 45.00, 0, 100.00, 'Construction Management'),
    ('PT-004', 'Primer Coat', 'Wall primer coat on new plastered surface', 'sqm', 9, 25.00, 20.00, 0, 45.00, 'Construction Management');
END
GO

PRINT 'Rate Analysis migration completed successfully';
GO
