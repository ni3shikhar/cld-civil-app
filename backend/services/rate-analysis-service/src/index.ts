import express, { Request, Response } from 'express';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.RATE_ANALYSIS_SERVICE_PORT || 3005;

app.use(express.json());

// Parse connection string if provided (for Azure deployment)
function parseConnectionString(connStr: string): sql.config {
  const params: Record<string, string> = {};
  connStr.split(';').forEach(part => {
    const [key, ...valueParts] = part.split('=');
    if (key && valueParts.length > 0) {
      params[key.trim().toLowerCase()] = valueParts.join('=').trim();
    }
  });
  
  let server = params['server'] || 'localhost';
  let port = 1433;
  if (server.startsWith('tcp:')) server = server.substring(4);
  if (server.includes(',')) {
    const [host, portStr] = server.split(',');
    server = host;
    port = parseInt(portStr) || 1433;
  }
  
  return {
    user: params['user id'] || params['uid'] || 'sa',
    password: params['password'] || params['pwd'] || '',
    server: server,
    database: params['database'] || params['initial catalog'] || 'ContosoCivilApp',
    port: port,
    options: {
      encrypt: params['encrypt']?.toLowerCase() === 'true',
      trustServerCertificate: params['trustservercertificate']?.toLowerCase() === 'true',
    },
  };
}

// SQL Server Configuration
const sqlConfig: sql.config = process.env.DB_CONNECTION_STRING
  ? parseConnectionString(process.env.DB_CONNECTION_STRING)
  : {
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'YourSQLPassword123!',
      server: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'ContosoCivilApp',
      port: parseInt(process.env.DB_PORT || '1433'),
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    };

let pool: sql.ConnectionPool;

async function initializeDatabase() {
  try {
    pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    console.log('Rate Analysis Service connected to SQL Server');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'Rate Analysis Service is running' });
});

// ==========================================
// SUBSCRIPTION MANAGEMENT ENDPOINTS
// ==========================================

// Get all subscription plans
app.get('/api/rate-analysis/plans', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT PlanId, PlanName, Description, Price, DurationDays, Features, IsActive
      FROM RateAnalysisPlans
      WHERE IsActive = 1
      ORDER BY Price ASC
    `);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Subscribe user to rate analysis (user self-subscribe)
app.post('/api/rate-analysis/subscribe', async (req: Request, res: Response) => {
  try {
    const { userId, planId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const request = new sql.Request(pool);
    
    // Check if user already has an active subscription
    const existingCheck = await request
      .input('checkUserId', sql.Int, userId)
      .query(`
        SELECT SubscriptionId, EndDate 
        FROM RateAnalysisSubscriptions 
        WHERE UserId = @checkUserId AND Status = 'Active' AND EndDate > GETDATE()
      `);
    
    if (existingCheck.recordset.length > 0) {
      return res.status(400).json({ 
        error: 'User already has an active subscription',
        subscription: existingCheck.recordset[0]
      });
    }

    // Get plan details (default to free plan if not specified)
    const planRequest = new sql.Request(pool);
    const planResult = await planRequest
      .input('planId', sql.Int, planId || 1) // Default to plan 1 (Free)
      .query(`SELECT PlanId, DurationDays, Price FROM RateAnalysisPlans WHERE PlanId = @planId`);
    
    if (planResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const plan = planResult.recordset[0];
    
    // Create subscription
    const insertRequest = new sql.Request(pool);
    const insertResult = await insertRequest
      .input('userId', sql.Int, userId)
      .input('planIdVal', sql.Int, plan.PlanId)
      .input('durationDays', sql.Int, plan.DurationDays)
      .query(`
        INSERT INTO RateAnalysisSubscriptions (UserId, PlanId, StartDate, EndDate, Status, IsAdminEnabled)
        OUTPUT INSERTED.SubscriptionId, INSERTED.StartDate, INSERTED.EndDate, INSERTED.Status
        VALUES (@userId, @planIdVal, GETDATE(), DATEADD(DAY, @durationDays, GETDATE()), 'Active', 1)
      `);

    res.status(201).json({
      message: 'Successfully subscribed to Rate Analysis',
      subscription: insertResult.recordset[0]
    });
  } catch (error: any) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Failed to subscribe to rate analysis' });
  }
});

// Get user's subscription status
app.get('/api/rate-analysis/subscription/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const request = new sql.Request(pool);
    
    const result = await request
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          s.SubscriptionId, s.UserId, s.PlanId, s.StartDate, s.EndDate, s.Status, s.IsAdminEnabled,
          p.PlanName, p.Description as PlanDescription, p.Price, p.Features
        FROM RateAnalysisSubscriptions s
        INNER JOIN RateAnalysisPlans p ON s.PlanId = p.PlanId
        WHERE s.UserId = @userId
        ORDER BY s.StartDate DESC
      `);
    
    if (result.recordset.length === 0) {
      return res.status(200).json({ hasSubscription: false, subscription: null });
    }

    const activeSubscription = result.recordset.find(
      (s: any) => s.Status === 'Active' && new Date(s.EndDate) > new Date() && s.IsAdminEnabled
    );

    res.status(200).json({
      hasSubscription: !!activeSubscription,
      isActive: !!activeSubscription,
      subscription: activeSubscription || result.recordset[0],
      history: result.recordset
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Cancel subscription
app.post('/api/rate-analysis/unsubscribe/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const request = new sql.Request(pool);
    
    await request
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE RateAnalysisSubscriptions 
        SET Status = 'Cancelled', UpdatedDate = GETDATE()
        WHERE UserId = @userId AND Status = 'Active'
      `);

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ==========================================
// ADMIN SUBSCRIPTION MANAGEMENT
// ==========================================

// Admin: Get all subscriptions
app.get('/api/rate-analysis/admin/subscriptions', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT 
        s.SubscriptionId, s.UserId, s.PlanId, s.StartDate, s.EndDate, s.Status, s.IsAdminEnabled, s.CreatedDate,
        u.Email, u.FirstName, u.LastName,
        p.PlanName, p.Price
      FROM RateAnalysisSubscriptions s
      INNER JOIN Users u ON s.UserId = u.UserId
      INNER JOIN RateAnalysisPlans p ON s.PlanId = p.PlanId
      ORDER BY s.CreatedDate DESC
    `);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Admin: Enable/Disable user access
app.patch('/api/rate-analysis/admin/subscription/:subscriptionId/access', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { isEnabled } = req.body;
    
    const request = new sql.Request(pool);
    await request
      .input('subscriptionId', sql.Int, subscriptionId)
      .input('isEnabled', sql.Bit, isEnabled)
      .query(`
        UPDATE RateAnalysisSubscriptions 
        SET IsAdminEnabled = @isEnabled, UpdatedDate = GETDATE()
        WHERE SubscriptionId = @subscriptionId
      `);

    res.status(200).json({ 
      message: `User access ${isEnabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error: any) {
    console.error('Error updating access:', error);
    res.status(500).json({ error: 'Failed to update user access' });
  }
});

// Admin: Grant access to user (create subscription for user)
app.post('/api/rate-analysis/admin/grant-access', async (req: Request, res: Response) => {
  try {
    const { userId, planId, durationDays } = req.body;
    
    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, userId)
      .input('planId', sql.Int, planId || 1)
      .input('durationDays', sql.Int, durationDays || 365)
      .query(`
        -- Deactivate existing subscriptions
        UPDATE RateAnalysisSubscriptions 
        SET Status = 'Superseded', UpdatedDate = GETDATE()
        WHERE UserId = @userId AND Status = 'Active';
        
        -- Create new subscription
        INSERT INTO RateAnalysisSubscriptions (UserId, PlanId, StartDate, EndDate, Status, IsAdminEnabled)
        OUTPUT INSERTED.*
        VALUES (@userId, @planId, GETDATE(), DATEADD(DAY, @durationDays, GETDATE()), 'Active', 1)
      `);

    res.status(201).json({
      message: 'Access granted successfully',
      subscription: result.recordset[0]
    });
  } catch (error: any) {
    console.error('Error granting access:', error);
    res.status(500).json({ error: 'Failed to grant access' });
  }
});

// Admin: Revoke access from user
app.post('/api/rate-analysis/admin/revoke-access/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const request = new sql.Request(pool);
    await request
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE RateAnalysisSubscriptions 
        SET Status = 'Revoked', IsAdminEnabled = 0, UpdatedDate = GETDATE()
        WHERE UserId = @userId AND Status = 'Active'
      `);

    res.status(200).json({ message: 'Access revoked successfully' });
  } catch (error: any) {
    console.error('Error revoking access:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// Admin: Get subscription summary
app.get('/api/rate-analysis/admin/summary', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT 
        COUNT(*) as TotalSubscriptions,
        SUM(CASE WHEN Status = 'Active' AND EndDate > GETDATE() AND IsAdminEnabled = 1 THEN 1 ELSE 0 END) as ActiveSubscriptions,
        SUM(CASE WHEN Status = 'Cancelled' THEN 1 ELSE 0 END) as CancelledSubscriptions,
        SUM(CASE WHEN IsAdminEnabled = 0 THEN 1 ELSE 0 END) as DisabledSubscriptions
      FROM RateAnalysisSubscriptions
    `);
    res.status(200).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch subscription summary' });
  }
});

// ==========================================
// RATE ANALYSIS DATA ENDPOINTS
// ==========================================

// Get rate categories
app.get('/api/rate-analysis/categories', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT CategoryId, CategoryName, Description, ParentCategoryId, SortOrder
      FROM RateAnalysisCategories
      WHERE IsActive = 1
      ORDER BY SortOrder, CategoryName
    `);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get rate items (with optional filtering)
app.get('/api/rate-analysis/items', async (req: Request, res: Response) => {
  try {
    const { categoryId, search, domain } = req.query;
    const request = new sql.Request(pool);
    
    let query = `
      SELECT 
        r.RateItemId, r.ItemCode, r.ItemName, r.Description, r.Unit, 
        r.MaterialRate, r.LaborRate, r.EquipmentRate, r.TotalRate,
        r.CivilDomain, r.EffectiveDate, r.ExpiryDate,
        c.CategoryName
      FROM RateAnalysisItems r
      LEFT JOIN RateAnalysisCategories c ON r.CategoryId = c.CategoryId
      WHERE r.IsActive = 1
    `;
    
    if (categoryId) {
      request.input('categoryId', sql.Int, categoryId);
      query += ' AND r.CategoryId = @categoryId';
    }
    
    if (search) {
      request.input('search', sql.VarChar, `%${search}%`);
      query += ' AND (r.ItemName LIKE @search OR r.ItemCode LIKE @search OR r.Description LIKE @search)';
    }
    
    if (domain) {
      request.input('domain', sql.VarChar, domain);
      query += ' AND r.CivilDomain = @domain';
    }
    
    query += ' ORDER BY r.ItemCode';
    
    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching rate items:', error);
    res.status(500).json({ error: 'Failed to fetch rate items' });
  }
});

// Get single rate item with history
app.get('/api/rate-analysis/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const request = new sql.Request(pool);
    
    const result = await request
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT 
          r.RateItemId, r.ItemCode, r.ItemName, r.Description, r.Unit, 
          r.MaterialRate, r.LaborRate, r.EquipmentRate, r.TotalRate,
          r.CivilDomain, r.EffectiveDate, r.ExpiryDate, r.Notes,
          c.CategoryName, c.CategoryId
        FROM RateAnalysisItems r
        LEFT JOIN RateAnalysisCategories c ON r.CategoryId = c.CategoryId
        WHERE r.RateItemId = @itemId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Rate item not found' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error fetching rate item:', error);
    res.status(500).json({ error: 'Failed to fetch rate item' });
  }
});

// Admin: Create rate item
app.post('/api/rate-analysis/items', async (req: Request, res: Response) => {
  try {
    const { 
      itemCode, itemName, description, unit, categoryId,
      materialRate, laborRate, equipmentRate, civilDomain, notes 
    } = req.body;
    
    const totalRate = (parseFloat(materialRate) || 0) + (parseFloat(laborRate) || 0) + (parseFloat(equipmentRate) || 0);
    
    const request = new sql.Request(pool);
    const result = await request
      .input('itemCode', sql.VarChar, itemCode)
      .input('itemName', sql.VarChar, itemName)
      .input('description', sql.VarChar, description)
      .input('unit', sql.VarChar, unit)
      .input('categoryId', sql.Int, categoryId)
      .input('materialRate', sql.Decimal(18, 2), materialRate || 0)
      .input('laborRate', sql.Decimal(18, 2), laborRate || 0)
      .input('equipmentRate', sql.Decimal(18, 2), equipmentRate || 0)
      .input('totalRate', sql.Decimal(18, 2), totalRate)
      .input('civilDomain', sql.VarChar, civilDomain)
      .input('notes', sql.VarChar, notes)
      .query(`
        INSERT INTO RateAnalysisItems 
        (ItemCode, ItemName, Description, Unit, CategoryId, MaterialRate, LaborRate, EquipmentRate, TotalRate, CivilDomain, Notes, EffectiveDate)
        OUTPUT INSERTED.*
        VALUES (@itemCode, @itemName, @description, @unit, @categoryId, @materialRate, @laborRate, @equipmentRate, @totalRate, @civilDomain, @notes, GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error creating rate item:', error);
    res.status(500).json({ error: 'Failed to create rate item' });
  }
});

// Admin: Update rate item
app.put('/api/rate-analysis/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { 
      itemCode, itemName, description, unit, categoryId,
      materialRate, laborRate, equipmentRate, civilDomain, notes 
    } = req.body;
    
    const totalRate = (parseFloat(materialRate) || 0) + (parseFloat(laborRate) || 0) + (parseFloat(equipmentRate) || 0);
    
    const request = new sql.Request(pool);
    await request
      .input('itemId', sql.Int, itemId)
      .input('itemCode', sql.VarChar, itemCode)
      .input('itemName', sql.VarChar, itemName)
      .input('description', sql.VarChar, description)
      .input('unit', sql.VarChar, unit)
      .input('categoryId', sql.Int, categoryId)
      .input('materialRate', sql.Decimal(18, 2), materialRate || 0)
      .input('laborRate', sql.Decimal(18, 2), laborRate || 0)
      .input('equipmentRate', sql.Decimal(18, 2), equipmentRate || 0)
      .input('totalRate', sql.Decimal(18, 2), totalRate)
      .input('civilDomain', sql.VarChar, civilDomain)
      .input('notes', sql.VarChar, notes)
      .query(`
        UPDATE RateAnalysisItems SET
          ItemCode = @itemCode, ItemName = @itemName, Description = @description,
          Unit = @unit, CategoryId = @categoryId, MaterialRate = @materialRate,
          LaborRate = @laborRate, EquipmentRate = @equipmentRate, TotalRate = @totalRate,
          CivilDomain = @civilDomain, Notes = @notes, UpdatedDate = GETDATE()
        WHERE RateItemId = @itemId
      `);

    res.status(200).json({ message: 'Rate item updated successfully' });
  } catch (error: any) {
    console.error('Error updating rate item:', error);
    res.status(500).json({ error: 'Failed to update rate item' });
  }
});

// Admin: Delete rate item
app.delete('/api/rate-analysis/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const request = new sql.Request(pool);
    
    await request
      .input('itemId', sql.Int, itemId)
      .query(`UPDATE RateAnalysisItems SET IsActive = 0, UpdatedDate = GETDATE() WHERE RateItemId = @itemId`);

    res.status(200).json({ message: 'Rate item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting rate item:', error);
    res.status(500).json({ error: 'Failed to delete rate item' });
  }
});

// Admin: Create category
app.post('/api/rate-analysis/categories', async (req: Request, res: Response) => {
  try {
    const { categoryName, description, parentCategoryId, sortOrder } = req.body;
    
    const request = new sql.Request(pool);
    const result = await request
      .input('categoryName', sql.VarChar, categoryName)
      .input('description', sql.VarChar, description)
      .input('parentCategoryId', sql.Int, parentCategoryId)
      .input('sortOrder', sql.Int, sortOrder || 0)
      .query(`
        INSERT INTO RateAnalysisCategories (CategoryName, Description, ParentCategoryId, SortOrder)
        OUTPUT INSERTED.*
        VALUES (@categoryName, @description, @parentCategoryId, @sortOrder)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==========================================
// MATERIAL RATES (Admin Configurable)
// ==========================================

// Get all materials
app.get('/api/rate-analysis/materials', async (req: Request, res: Response) => {
  try {
    const { categoryId, search } = req.query;
    const request = new sql.Request(pool);
    
    let query = `
      SELECT m.MaterialId, m.MaterialCode, m.MaterialName, m.Description, m.Unit, m.UnitRate,
             m.CategoryId, m.SupplierInfo, m.IsActive, m.EffectiveDate,
             c.CategoryName
      FROM RateMaterials m
      LEFT JOIN RateAnalysisCategories c ON m.CategoryId = c.CategoryId
      WHERE m.IsActive = 1
    `;
    
    if (categoryId) {
      request.input('categoryId', sql.Int, categoryId);
      query += ' AND m.CategoryId = @categoryId';
    }
    
    if (search) {
      request.input('search', sql.VarChar, `%${search}%`);
      query += ' AND (m.MaterialName LIKE @search OR m.MaterialCode LIKE @search)';
    }
    
    query += ' ORDER BY m.MaterialCode';
    
    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Admin: Create material
app.post('/api/rate-analysis/materials', async (req: Request, res: Response) => {
  try {
    const { materialCode, materialName, description, unit, unitRate, categoryId, supplierInfo, createdBy } = req.body;
    
    const request = new sql.Request(pool);
    const result = await request
      .input('materialCode', sql.VarChar, materialCode)
      .input('materialName', sql.VarChar, materialName)
      .input('description', sql.VarChar, description)
      .input('unit', sql.VarChar, unit)
      .input('unitRate', sql.Decimal(18, 2), unitRate || 0)
      .input('categoryId', sql.Int, categoryId)
      .input('supplierInfo', sql.VarChar, supplierInfo)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO RateMaterials (MaterialCode, MaterialName, Description, Unit, UnitRate, CategoryId, SupplierInfo, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@materialCode, @materialName, @description, @unit, @unitRate, @categoryId, @supplierInfo, @createdBy)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// Admin: Update material
app.put('/api/rate-analysis/materials/:materialId', async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;
    const { materialCode, materialName, description, unit, unitRate, categoryId, supplierInfo } = req.body;
    
    const request = new sql.Request(pool);
    await request
      .input('materialId', sql.Int, materialId)
      .input('materialCode', sql.VarChar, materialCode)
      .input('materialName', sql.VarChar, materialName)
      .input('description', sql.VarChar, description)
      .input('unit', sql.VarChar, unit)
      .input('unitRate', sql.Decimal(18, 2), unitRate || 0)
      .input('categoryId', sql.Int, categoryId)
      .input('supplierInfo', sql.VarChar, supplierInfo)
      .query(`
        UPDATE RateMaterials SET
          MaterialCode = @materialCode, MaterialName = @materialName, Description = @description,
          Unit = @unit, UnitRate = @unitRate, CategoryId = @categoryId, SupplierInfo = @supplierInfo,
          UpdatedDate = GETDATE()
        WHERE MaterialId = @materialId
      `);

    res.status(200).json({ message: 'Material updated successfully' });
  } catch (error: any) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// Admin: Delete material
app.delete('/api/rate-analysis/materials/:materialId', async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;
    const request = new sql.Request(pool);
    
    await request
      .input('materialId', sql.Int, materialId)
      .query(`UPDATE RateMaterials SET IsActive = 0, UpdatedDate = GETDATE() WHERE MaterialId = @materialId`);

    res.status(200).json({ message: 'Material deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// ==========================================
// LABOR RATES (Admin Configurable)
// ==========================================

// Get all labor rates
app.get('/api/rate-analysis/labor', async (req: Request, res: Response) => {
  try {
    const { skillLevel, search } = req.query;
    const request = new sql.Request(pool);
    
    let query = `
      SELECT l.LaborId, l.LaborCode, l.LaborType, l.Description, l.SkillLevel, l.Unit, 
             l.UnitRate, l.OvertimeRate, l.CategoryId, l.IsActive, l.EffectiveDate,
             c.CategoryName
      FROM RateLabor l
      LEFT JOIN RateAnalysisCategories c ON l.CategoryId = c.CategoryId
      WHERE l.IsActive = 1
    `;
    
    if (skillLevel) {
      request.input('skillLevel', sql.VarChar, skillLevel);
      query += ' AND l.SkillLevel = @skillLevel';
    }
    
    if (search) {
      request.input('search', sql.VarChar, `%${search}%`);
      query += ' AND (l.LaborType LIKE @search OR l.LaborCode LIKE @search)';
    }
    
    query += ' ORDER BY l.LaborCode';
    
    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching labor rates:', error);
    res.status(500).json({ error: 'Failed to fetch labor rates' });
  }
});

// Admin: Create labor rate
app.post('/api/rate-analysis/labor', async (req: Request, res: Response) => {
  try {
    const { laborCode, laborType, description, skillLevel, unit, unitRate, overtimeRate, categoryId, createdBy } = req.body;
    
    const request = new sql.Request(pool);
    const result = await request
      .input('laborCode', sql.VarChar, laborCode)
      .input('laborType', sql.VarChar, laborType)
      .input('description', sql.VarChar, description)
      .input('skillLevel', sql.VarChar, skillLevel)
      .input('unit', sql.VarChar, unit || 'day')
      .input('unitRate', sql.Decimal(18, 2), unitRate || 0)
      .input('overtimeRate', sql.Decimal(18, 2), overtimeRate || 0)
      .input('categoryId', sql.Int, categoryId)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO RateLabor (LaborCode, LaborType, Description, SkillLevel, Unit, UnitRate, OvertimeRate, CategoryId, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@laborCode, @laborType, @description, @skillLevel, @unit, @unitRate, @overtimeRate, @categoryId, @createdBy)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error creating labor rate:', error);
    res.status(500).json({ error: 'Failed to create labor rate' });
  }
});

// Admin: Update labor rate
app.put('/api/rate-analysis/labor/:laborId', async (req: Request, res: Response) => {
  try {
    const { laborId } = req.params;
    const { laborCode, laborType, description, skillLevel, unit, unitRate, overtimeRate, categoryId } = req.body;
    
    const request = new sql.Request(pool);
    await request
      .input('laborId', sql.Int, laborId)
      .input('laborCode', sql.VarChar, laborCode)
      .input('laborType', sql.VarChar, laborType)
      .input('description', sql.VarChar, description)
      .input('skillLevel', sql.VarChar, skillLevel)
      .input('unit', sql.VarChar, unit || 'day')
      .input('unitRate', sql.Decimal(18, 2), unitRate || 0)
      .input('overtimeRate', sql.Decimal(18, 2), overtimeRate || 0)
      .input('categoryId', sql.Int, categoryId)
      .query(`
        UPDATE RateLabor SET
          LaborCode = @laborCode, LaborType = @laborType, Description = @description,
          SkillLevel = @skillLevel, Unit = @unit, UnitRate = @unitRate, OvertimeRate = @overtimeRate,
          CategoryId = @categoryId, UpdatedDate = GETDATE()
        WHERE LaborId = @laborId
      `);

    res.status(200).json({ message: 'Labor rate updated successfully' });
  } catch (error: any) {
    console.error('Error updating labor rate:', error);
    res.status(500).json({ error: 'Failed to update labor rate' });
  }
});

// Admin: Delete labor rate
app.delete('/api/rate-analysis/labor/:laborId', async (req: Request, res: Response) => {
  try {
    const { laborId } = req.params;
    const request = new sql.Request(pool);
    
    await request
      .input('laborId', sql.Int, laborId)
      .query(`UPDATE RateLabor SET IsActive = 0, UpdatedDate = GETDATE() WHERE LaborId = @laborId`);

    res.status(200).json({ message: 'Labor rate deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting labor rate:', error);
    res.status(500).json({ error: 'Failed to delete labor rate' });
  }
});

// ==========================================
// MACHINERY RATES (Admin Configurable)
// ==========================================

// Get all machinery rates
app.get('/api/rate-analysis/machinery', async (req: Request, res: Response) => {
  try {
    const { machineryType, search } = req.query;
    const request = new sql.Request(pool);
    
    let query = `
      SELECT m.MachineryId, m.MachineryCode, m.MachineryName, m.Description, m.MachineryType,
             m.Capacity, m.Unit, m.UnitRate, m.FuelIncluded, m.OperatorIncluded,
             m.CategoryId, m.IsActive, m.EffectiveDate,
             c.CategoryName
      FROM RateMachinery m
      LEFT JOIN RateAnalysisCategories c ON m.CategoryId = c.CategoryId
      WHERE m.IsActive = 1
    `;
    
    if (machineryType) {
      request.input('machineryType', sql.VarChar, machineryType);
      query += ' AND m.MachineryType = @machineryType';
    }
    
    if (search) {
      request.input('search', sql.VarChar, `%${search}%`);
      query += ' AND (m.MachineryName LIKE @search OR m.MachineryCode LIKE @search)';
    }
    
    query += ' ORDER BY m.MachineryCode';
    
    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching machinery rates:', error);
    res.status(500).json({ error: 'Failed to fetch machinery rates' });
  }
});

// Admin: Create machinery rate
app.post('/api/rate-analysis/machinery', async (req: Request, res: Response) => {
  try {
    const { machineryCode, machineryName, description, machineryType, capacity, unit, unitRate, fuelIncluded, operatorIncluded, categoryId, createdBy } = req.body;
    
    const request = new sql.Request(pool);
    const result = await request
      .input('machineryCode', sql.VarChar, machineryCode)
      .input('machineryName', sql.VarChar, machineryName)
      .input('description', sql.VarChar, description)
      .input('machineryType', sql.VarChar, machineryType)
      .input('capacity', sql.VarChar, capacity)
      .input('unit', sql.VarChar, unit || 'hour')
      .input('unitRate', sql.Decimal(18, 2), unitRate || 0)
      .input('fuelIncluded', sql.Bit, fuelIncluded ?? true)
      .input('operatorIncluded', sql.Bit, operatorIncluded ?? false)
      .input('categoryId', sql.Int, categoryId)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO RateMachinery (MachineryCode, MachineryName, Description, MachineryType, Capacity, Unit, UnitRate, FuelIncluded, OperatorIncluded, CategoryId, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@machineryCode, @machineryName, @description, @machineryType, @capacity, @unit, @unitRate, @fuelIncluded, @operatorIncluded, @categoryId, @createdBy)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error creating machinery rate:', error);
    res.status(500).json({ error: 'Failed to create machinery rate' });
  }
});

// Admin: Update machinery rate
app.put('/api/rate-analysis/machinery/:machineryId', async (req: Request, res: Response) => {
  try {
    const { machineryId } = req.params;
    const { machineryCode, machineryName, description, machineryType, capacity, unit, unitRate, fuelIncluded, operatorIncluded, categoryId } = req.body;
    
    const request = new sql.Request(pool);
    await request
      .input('machineryId', sql.Int, machineryId)
      .input('machineryCode', sql.VarChar, machineryCode)
      .input('machineryName', sql.VarChar, machineryName)
      .input('description', sql.VarChar, description)
      .input('machineryType', sql.VarChar, machineryType)
      .input('capacity', sql.VarChar, capacity)
      .input('unit', sql.VarChar, unit || 'hour')
      .input('unitRate', sql.Decimal(18, 2), unitRate || 0)
      .input('fuelIncluded', sql.Bit, fuelIncluded ?? true)
      .input('operatorIncluded', sql.Bit, operatorIncluded ?? false)
      .input('categoryId', sql.Int, categoryId)
      .query(`
        UPDATE RateMachinery SET
          MachineryCode = @machineryCode, MachineryName = @machineryName, Description = @description,
          MachineryType = @machineryType, Capacity = @capacity, Unit = @unit, UnitRate = @unitRate,
          FuelIncluded = @fuelIncluded, OperatorIncluded = @operatorIncluded, CategoryId = @categoryId,
          UpdatedDate = GETDATE()
        WHERE MachineryId = @machineryId
      `);

    res.status(200).json({ message: 'Machinery rate updated successfully' });
  } catch (error: any) {
    console.error('Error updating machinery rate:', error);
    res.status(500).json({ error: 'Failed to update machinery rate' });
  }
});

// Admin: Delete machinery rate
app.delete('/api/rate-analysis/machinery/:machineryId', async (req: Request, res: Response) => {
  try {
    const { machineryId } = req.params;
    const request = new sql.Request(pool);
    
    await request
      .input('machineryId', sql.Int, machineryId)
      .query(`UPDATE RateMachinery SET IsActive = 0, UpdatedDate = GETDATE() WHERE MachineryId = @machineryId`);

    res.status(200).json({ message: 'Machinery rate deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting machinery rate:', error);
    res.status(500).json({ error: 'Failed to delete machinery rate' });
  }
});

// ==========================================
// COMPOSITE ITEMS (Admin creates using base rates)
// ==========================================

// Get all composite items (for users - no rate breakdown)
app.get('/api/rate-analysis/composite-items', async (req: Request, res: Response) => {
  try {
    const { categoryId, search, domain } = req.query;
    const request = new sql.Request(pool);
    
    let query = `
      SELECT ci.CompositeItemId, ci.ItemCode, ci.ItemName, ci.Description, ci.Unit,
             ci.CategoryId, ci.CivilDomain, ci.TotalRate, ci.IsActive, ci.EffectiveDate,
             c.CategoryName
      FROM RateCompositeItems ci
      LEFT JOIN RateAnalysisCategories c ON ci.CategoryId = c.CategoryId
      WHERE ci.IsActive = 1
    `;
    
    if (categoryId) {
      request.input('categoryId', sql.Int, categoryId);
      query += ' AND ci.CategoryId = @categoryId';
    }
    
    if (search) {
      request.input('search', sql.VarChar, `%${search}%`);
      query += ' AND (ci.ItemName LIKE @search OR ci.ItemCode LIKE @search)';
    }
    
    if (domain) {
      request.input('domain', sql.VarChar, domain);
      query += ' AND ci.CivilDomain = @domain';
    }
    
    query += ' ORDER BY ci.ItemCode';
    
    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching composite items:', error);
    res.status(500).json({ error: 'Failed to fetch composite items' });
  }
});

// Admin: Get composite items with full rate breakdown
app.get('/api/rate-analysis/admin/composite-items', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    
    const result = await request.query(`
      SELECT ci.*, c.CategoryName
      FROM RateCompositeItems ci
      LEFT JOIN RateAnalysisCategories c ON ci.CategoryId = c.CategoryId
      WHERE ci.IsActive = 1
      ORDER BY ci.ItemCode
    `);
    
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching composite items:', error);
    res.status(500).json({ error: 'Failed to fetch composite items' });
  }
});

// Admin: Get single composite item with components
app.get('/api/rate-analysis/admin/composite-items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const request = new sql.Request(pool);
    
    // Get the composite item
    const itemResult = await request
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT ci.*, c.CategoryName
        FROM RateCompositeItems ci
        LEFT JOIN RateAnalysisCategories c ON ci.CategoryId = c.CategoryId
        WHERE ci.CompositeItemId = @itemId
      `);
    
    if (itemResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Composite item not found' });
    }
    
    // Get components
    const componentsRequest = new sql.Request(pool);
    const componentsResult = await componentsRequest
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT cc.ComponentId, cc.CompositeItemId, cc.ComponentType, cc.ReferenceId, cc.Quantity, cc.WastagePercent, cc.Notes,
          CASE 
            WHEN cc.ComponentType = 'Material' THEN m.MaterialName
            WHEN cc.ComponentType = 'Labor' THEN l.LaborType
            WHEN cc.ComponentType = 'Machinery' THEN mc.MachineryName
          END as ComponentName,
          CASE 
            WHEN cc.ComponentType = 'Material' THEN m.MaterialCode
            WHEN cc.ComponentType = 'Labor' THEN l.LaborCode
            WHEN cc.ComponentType = 'Machinery' THEN mc.MachineryCode
          END as ComponentCode,
          CASE 
            WHEN cc.ComponentType = 'Material' THEN m.Unit
            WHEN cc.ComponentType = 'Labor' THEN l.Unit
            WHEN cc.ComponentType = 'Machinery' THEN mc.Unit
          END as Unit,
          CASE 
            WHEN cc.ComponentType = 'Material' THEN m.UnitRate
            WHEN cc.ComponentType = 'Labor' THEN l.UnitRate
            WHEN cc.ComponentType = 'Machinery' THEN mc.UnitRate
          END as UnitRate
        FROM RateCompositeComponents cc
        LEFT JOIN RateMaterials m ON cc.ComponentType = 'Material' AND cc.ReferenceId = m.MaterialId
        LEFT JOIN RateLabor l ON cc.ComponentType = 'Labor' AND cc.ReferenceId = l.LaborId
        LEFT JOIN RateMachinery mc ON cc.ComponentType = 'Machinery' AND cc.ReferenceId = mc.MachineryId
        WHERE cc.CompositeItemId = @itemId
        ORDER BY cc.ComponentType, cc.ComponentId
      `);
    
    res.status(200).json({
      ...itemResult.recordset[0],
      components: componentsResult.recordset
    });
  } catch (error: any) {
    console.error('Error fetching composite item:', error);
    res.status(500).json({ error: 'Failed to fetch composite item' });
  }
});

// Admin: Create composite item with components
app.post('/api/rate-analysis/admin/composite-items', async (req: Request, res: Response) => {
  try {
    const { itemCode, itemName, description, unit, categoryId, civilDomain, overheadPercent, notes, components, createdBy } = req.body;
    
    const request = new sql.Request(pool);
    
    // Create the composite item
    const itemResult = await request
      .input('itemCode', sql.VarChar, itemCode)
      .input('itemName', sql.VarChar, itemName)
      .input('description', sql.VarChar, description)
      .input('unit', sql.VarChar, unit)
      .input('categoryId', sql.Int, categoryId)
      .input('civilDomain', sql.VarChar, civilDomain)
      .input('overheadPercent', sql.Decimal(5, 2), overheadPercent || 10)
      .input('notes', sql.VarChar, notes)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO RateCompositeItems (ItemCode, ItemName, Description, Unit, CategoryId, CivilDomain, OverheadPercent, Notes, CreatedBy)
        OUTPUT INSERTED.CompositeItemId
        VALUES (@itemCode, @itemName, @description, @unit, @categoryId, @civilDomain, @overheadPercent, @notes, @createdBy)
      `);
    
    const compositeItemId = itemResult.recordset[0].CompositeItemId;
    
    // Add components if provided
    if (components && components.length > 0) {
      for (const comp of components) {
        const compRequest = new sql.Request(pool);
        await compRequest
          .input('compositeItemId', sql.Int, compositeItemId)
          .input('componentType', sql.VarChar, comp.componentType)
          .input('referenceId', sql.Int, comp.referenceId)
          .input('quantity', sql.Decimal(18, 4), comp.quantity || 1)
          .input('wastagePercent', sql.Decimal(5, 2), comp.wastagePercent || 0)
          .input('notes', sql.VarChar, comp.notes)
          .query(`
            INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
            VALUES (@compositeItemId, @componentType, @referenceId, @quantity, @wastagePercent, @notes)
          `);
      }
    }
    
    // Calculate and update totals
    await recalculateCompositeItemTotals(compositeItemId);
    
    res.status(201).json({ message: 'Composite item created successfully', compositeItemId });
  } catch (error: any) {
    console.error('Error creating composite item:', error);
    res.status(500).json({ error: 'Failed to create composite item' });
  }
});

// Helper function to recalculate composite item totals
async function recalculateCompositeItemTotals(compositeItemId: number) {
  try {
    const request = new sql.Request(pool);
    await request
      .input('compositeItemId', sql.Int, compositeItemId)
      .query(`
        -- Calculate material cost
        DECLARE @materialCost DECIMAL(18,2) = 0;
        DECLARE @laborCost DECIMAL(18,2) = 0;
        DECLARE @machineryCost DECIMAL(18,2) = 0;
        DECLARE @overhead DECIMAL(5,2) = 0;
        
        SELECT @materialCost = ISNULL(SUM(cc.Quantity * m.UnitRate * (1 + ISNULL(cc.WastagePercent, 0) / 100)), 0)
        FROM RateCompositeComponents cc
        INNER JOIN RateMaterials m ON cc.ReferenceId = m.MaterialId
        WHERE cc.CompositeItemId = @compositeItemId AND cc.ComponentType = 'Material';
        
        SELECT @laborCost = ISNULL(SUM(cc.Quantity * l.UnitRate), 0)
        FROM RateCompositeComponents cc
        INNER JOIN RateLabor l ON cc.ReferenceId = l.LaborId
        WHERE cc.CompositeItemId = @compositeItemId AND cc.ComponentType = 'Labor';
        
        SELECT @machineryCost = ISNULL(SUM(cc.Quantity * mc.UnitRate), 0)
        FROM RateCompositeComponents cc
        INNER JOIN RateMachinery mc ON cc.ReferenceId = mc.MachineryId
        WHERE cc.CompositeItemId = @compositeItemId AND cc.ComponentType = 'Machinery';
        
        SELECT @overhead = ISNULL(OverheadPercent, 10) FROM RateCompositeItems WHERE CompositeItemId = @compositeItemId;
        
        UPDATE RateCompositeItems SET
          MaterialCost = @materialCost,
          LaborCost = @laborCost,
          MachineryCost = @machineryCost,
          TotalRate = (@materialCost + @laborCost + @machineryCost) * (1 + @overhead / 100),
          UpdatedDate = GETDATE()
        WHERE CompositeItemId = @compositeItemId;
      `);
  } catch (error) {
    console.error('Error recalculating composite item totals:', error);
    throw error;
  }
}

// Admin: Update composite item
app.put('/api/rate-analysis/admin/composite-items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { itemCode, itemName, description, unit, categoryId, civilDomain, overheadPercent, notes, components } = req.body;
    
    const request = new sql.Request(pool);
    await request
      .input('itemId', sql.Int, itemId)
      .input('itemCode', sql.VarChar, itemCode)
      .input('itemName', sql.VarChar, itemName)
      .input('description', sql.VarChar, description)
      .input('unit', sql.VarChar, unit)
      .input('categoryId', sql.Int, categoryId)
      .input('civilDomain', sql.VarChar, civilDomain)
      .input('overheadPercent', sql.Decimal(5, 2), overheadPercent || 10)
      .input('notes', sql.VarChar, notes)
      .query(`
        UPDATE RateCompositeItems SET
          ItemCode = @itemCode, ItemName = @itemName, Description = @description,
          Unit = @unit, CategoryId = @categoryId, CivilDomain = @civilDomain,
          OverheadPercent = @overheadPercent, Notes = @notes, UpdatedDate = GETDATE()
        WHERE CompositeItemId = @itemId
      `);
    
    // Update components if provided
    if (components) {
      // Delete existing components
      const deleteRequest = new sql.Request(pool);
      await deleteRequest
        .input('itemId', sql.Int, itemId)
        .query(`DELETE FROM RateCompositeComponents WHERE CompositeItemId = @itemId`);
      
      // Add new components
      for (const comp of components) {
        const compRequest = new sql.Request(pool);
        await compRequest
          .input('compositeItemId', sql.Int, itemId)
          .input('componentType', sql.VarChar, comp.componentType)
          .input('referenceId', sql.Int, comp.referenceId)
          .input('quantity', sql.Decimal(18, 4), comp.quantity || 1)
          .input('wastagePercent', sql.Decimal(5, 2), comp.wastagePercent || 0)
          .input('notes', sql.VarChar, comp.notes)
          .query(`
            INSERT INTO RateCompositeComponents (CompositeItemId, ComponentType, ReferenceId, Quantity, WastagePercent, Notes)
            VALUES (@compositeItemId, @componentType, @referenceId, @quantity, @wastagePercent, @notes)
          `);
      }
    }
    
    // Recalculate totals
    await recalculateCompositeItemTotals(parseInt(itemId));
    
    res.status(200).json({ message: 'Composite item updated successfully' });
  } catch (error: any) {
    console.error('Error updating composite item:', error);
    res.status(500).json({ error: 'Failed to update composite item' });
  }
});

// Admin: Delete composite item
app.delete('/api/rate-analysis/admin/composite-items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const request = new sql.Request(pool);
    
    await request
      .input('itemId', sql.Int, itemId)
      .query(`UPDATE RateCompositeItems SET IsActive = 0, UpdatedDate = GETDATE() WHERE CompositeItemId = @itemId`);

    res.status(200).json({ message: 'Composite item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting composite item:', error);
    res.status(500).json({ error: 'Failed to delete composite item' });
  }
});

// Admin: Recalculate all composite items
app.post('/api/rate-analysis/admin/recalculate-rates', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const items = await request.query(`SELECT CompositeItemId FROM RateCompositeItems WHERE IsActive = 1`);
    
    for (const item of items.recordset) {
      await recalculateCompositeItemTotals(item.CompositeItemId);
    }
    
    res.status(200).json({ message: 'All rates recalculated successfully', count: items.recordset.length });
  } catch (error: any) {
    console.error('Error recalculating rates:', error);
    res.status(500).json({ error: 'Failed to recalculate rates' });
  }
});

// ==========================================
// USER JOBS (Subscribed Users)
// ==========================================

// Get user's jobs
app.get('/api/rate-analysis/jobs/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    const request = new sql.Request(pool);
    
    let query = `
      SELECT JobId, UserId, JobName, JobDescription, ClientName, ProjectLocation, Status,
             TotalMaterialCost, TotalLaborCost, TotalMachineryCost, TotalOverheadCost, GrandTotal,
             EstimatedStartDate, EstimatedEndDate, CreatedDate, UpdatedDate
      FROM RateUserJobs
      WHERE UserId = @userId
    `;
    
    request.input('userId', sql.Int, userId);
    
    if (status) {
      request.input('status', sql.VarChar, status);
      query += ' AND Status = @status';
    }
    
    query += ' ORDER BY CreatedDate DESC';
    
    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job with items (only shows total rates, not breakdown)
app.get('/api/rate-analysis/jobs/:userId/:jobId', async (req: Request, res: Response) => {
  try {
    const { userId, jobId } = req.params;
    const request = new sql.Request(pool);
    
    // Get job
    const jobResult = await request
      .input('userId', sql.Int, userId)
      .input('jobId', sql.Int, jobId)
      .query(`
        SELECT * FROM RateUserJobs
        WHERE JobId = @jobId AND UserId = @userId
      `);
    
    if (jobResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Get job items (only show total rate, not breakdown)
    const itemsRequest = new sql.Request(pool);
    const itemsResult = await itemsRequest
      .input('jobId', sql.Int, jobId)
      .query(`
        SELECT ji.JobItemId, ji.JobId, ji.CompositeItemId, ji.Quantity, ji.CalculatedTotal,
               ji.Notes, ji.SortOrder,
               ci.ItemCode, ci.ItemName, ci.Unit, ci.TotalRate as UnitRate
        FROM RateUserJobItems ji
        INNER JOIN RateCompositeItems ci ON ji.CompositeItemId = ci.CompositeItemId
        WHERE ji.JobId = @jobId
        ORDER BY ji.SortOrder, ji.JobItemId
      `);
    
    res.status(200).json({
      ...jobResult.recordset[0],
      items: itemsResult.recordset
    });
  } catch (error: any) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Create new job
app.post('/api/rate-analysis/jobs', async (req: Request, res: Response) => {
  try {
    const { userId, jobName, jobDescription, clientName, projectLocation, estimatedStartDate, estimatedEndDate } = req.body;
    
    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, userId)
      .input('jobName', sql.VarChar, jobName)
      .input('jobDescription', sql.VarChar, jobDescription)
      .input('clientName', sql.VarChar, clientName)
      .input('projectLocation', sql.VarChar, projectLocation)
      .input('estimatedStartDate', sql.Date, estimatedStartDate)
      .input('estimatedEndDate', sql.Date, estimatedEndDate)
      .query(`
        INSERT INTO RateUserJobs (UserId, JobName, JobDescription, ClientName, ProjectLocation, EstimatedStartDate, EstimatedEndDate)
        OUTPUT INSERTED.*
        VALUES (@userId, @jobName, @jobDescription, @clientName, @projectLocation, @estimatedStartDate, @estimatedEndDate)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
app.put('/api/rate-analysis/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { jobName, jobDescription, clientName, projectLocation, status, estimatedStartDate, estimatedEndDate } = req.body;
    
    const request = new sql.Request(pool);
    await request
      .input('jobId', sql.Int, jobId)
      .input('jobName', sql.VarChar, jobName)
      .input('jobDescription', sql.VarChar, jobDescription)
      .input('clientName', sql.VarChar, clientName)
      .input('projectLocation', sql.VarChar, projectLocation)
      .input('status', sql.VarChar, status)
      .input('estimatedStartDate', sql.Date, estimatedStartDate)
      .input('estimatedEndDate', sql.Date, estimatedEndDate)
      .query(`
        UPDATE RateUserJobs SET
          JobName = @jobName, JobDescription = @jobDescription, ClientName = @clientName,
          ProjectLocation = @projectLocation, Status = @status,
          EstimatedStartDate = @estimatedStartDate, EstimatedEndDate = @estimatedEndDate,
          UpdatedDate = GETDATE()
        WHERE JobId = @jobId
      `);

    res.status(200).json({ message: 'Job updated successfully' });
  } catch (error: any) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
app.delete('/api/rate-analysis/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const request = new sql.Request(pool);
    
    await request
      .input('jobId', sql.Int, jobId)
      .query(`DELETE FROM RateUserJobs WHERE JobId = @jobId`);

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Add item to job
app.post('/api/rate-analysis/jobs/:jobId/items', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { compositeItemId, quantity, notes, sortOrder } = req.body;
    
    // Get composite item rate
    const rateRequest = new sql.Request(pool);
    const rateResult = await rateRequest
      .input('compositeItemId', sql.Int, compositeItemId)
      .query(`
        SELECT MaterialCost, LaborCost, MachineryCost, OverheadPercent, TotalRate
        FROM RateCompositeItems WHERE CompositeItemId = @compositeItemId
      `);
    
    if (rateResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Invalid composite item' });
    }
    
    const rate = rateResult.recordset[0];
    const qty = parseFloat(quantity) || 1;
    const calculatedMaterial = rate.MaterialCost * qty;
    const calculatedLabor = rate.LaborCost * qty;
    const calculatedMachinery = rate.MachineryCost * qty;
    const subtotal = calculatedMaterial + calculatedLabor + calculatedMachinery;
    const calculatedOverhead = subtotal * (rate.OverheadPercent / 100);
    const calculatedTotal = subtotal + calculatedOverhead;
    
    const request = new sql.Request(pool);
    const result = await request
      .input('jobId', sql.Int, jobId)
      .input('compositeItemId', sql.Int, compositeItemId)
      .input('quantity', sql.Decimal(18, 4), qty)
      .input('calculatedMaterial', sql.Decimal(18, 2), calculatedMaterial)
      .input('calculatedLabor', sql.Decimal(18, 2), calculatedLabor)
      .input('calculatedMachinery', sql.Decimal(18, 2), calculatedMachinery)
      .input('calculatedOverhead', sql.Decimal(18, 2), calculatedOverhead)
      .input('calculatedTotal', sql.Decimal(18, 2), calculatedTotal)
      .input('notes', sql.VarChar, notes)
      .input('sortOrder', sql.Int, sortOrder || 0)
      .query(`
        INSERT INTO RateUserJobItems (JobId, CompositeItemId, Quantity, CalculatedMaterialCost, CalculatedLaborCost, CalculatedMachineryCost, CalculatedOverhead, CalculatedTotal, Notes, SortOrder)
        OUTPUT INSERTED.*
        VALUES (@jobId, @compositeItemId, @quantity, @calculatedMaterial, @calculatedLabor, @calculatedMachinery, @calculatedOverhead, @calculatedTotal, @notes, @sortOrder)
      `);
    
    // Update job totals
    await recalculateJobTotals(parseInt(jobId));
    
    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    console.error('Error adding job item:', error);
    res.status(500).json({ error: 'Failed to add item to job' });
  }
});

// Helper function to recalculate job totals
async function recalculateJobTotals(jobId: number) {
  try {
    const request = new sql.Request(pool);
    await request
      .input('jobId', sql.Int, jobId)
      .query(`
        UPDATE RateUserJobs SET
          TotalMaterialCost = ISNULL((SELECT SUM(CalculatedMaterialCost) FROM RateUserJobItems WHERE JobId = @jobId), 0),
          TotalLaborCost = ISNULL((SELECT SUM(CalculatedLaborCost) FROM RateUserJobItems WHERE JobId = @jobId), 0),
          TotalMachineryCost = ISNULL((SELECT SUM(CalculatedMachineryCost) FROM RateUserJobItems WHERE JobId = @jobId), 0),
          TotalOverheadCost = ISNULL((SELECT SUM(CalculatedOverhead) FROM RateUserJobItems WHERE JobId = @jobId), 0),
          GrandTotal = ISNULL((SELECT SUM(CalculatedTotal) FROM RateUserJobItems WHERE JobId = @jobId), 0),
          UpdatedDate = GETDATE()
        WHERE JobId = @jobId
      `);
  } catch (error) {
    console.error('Error recalculating job totals:', error);
    throw error;
  }
}

// Update job item quantity
app.put('/api/rate-analysis/jobs/:jobId/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { jobId, itemId } = req.params;
    const { quantity, notes, sortOrder } = req.body;
    
    // Get current item and its composite rate
    const itemRequest = new sql.Request(pool);
    const itemResult = await itemRequest
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT ji.CompositeItemId, ci.MaterialCost, ci.LaborCost, ci.MachineryCost, ci.OverheadPercent
        FROM RateUserJobItems ji
        INNER JOIN RateCompositeItems ci ON ji.CompositeItemId = ci.CompositeItemId
        WHERE ji.JobItemId = @itemId
      `);
    
    if (itemResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Job item not found' });
    }
    
    const rate = itemResult.recordset[0];
    const qty = parseFloat(quantity) || 1;
    const calculatedMaterial = rate.MaterialCost * qty;
    const calculatedLabor = rate.LaborCost * qty;
    const calculatedMachinery = rate.MachineryCost * qty;
    const subtotal = calculatedMaterial + calculatedLabor + calculatedMachinery;
    const calculatedOverhead = subtotal * (rate.OverheadPercent / 100);
    const calculatedTotal = subtotal + calculatedOverhead;
    
    const request = new sql.Request(pool);
    await request
      .input('itemId', sql.Int, itemId)
      .input('quantity', sql.Decimal(18, 4), qty)
      .input('calculatedMaterial', sql.Decimal(18, 2), calculatedMaterial)
      .input('calculatedLabor', sql.Decimal(18, 2), calculatedLabor)
      .input('calculatedMachinery', sql.Decimal(18, 2), calculatedMachinery)
      .input('calculatedOverhead', sql.Decimal(18, 2), calculatedOverhead)
      .input('calculatedTotal', sql.Decimal(18, 2), calculatedTotal)
      .input('notes', sql.VarChar, notes)
      .input('sortOrder', sql.Int, sortOrder || 0)
      .query(`
        UPDATE RateUserJobItems SET
          Quantity = @quantity, CalculatedMaterialCost = @calculatedMaterial,
          CalculatedLaborCost = @calculatedLabor, CalculatedMachineryCost = @calculatedMachinery,
          CalculatedOverhead = @calculatedOverhead, CalculatedTotal = @calculatedTotal,
          Notes = @notes, SortOrder = @sortOrder, UpdatedDate = GETDATE()
        WHERE JobItemId = @itemId
      `);
    
    // Update job totals
    await recalculateJobTotals(parseInt(jobId));
    
    res.status(200).json({ message: 'Job item updated successfully' });
  } catch (error: any) {
    console.error('Error updating job item:', error);
    res.status(500).json({ error: 'Failed to update job item' });
  }
});

// Remove item from job
app.delete('/api/rate-analysis/jobs/:jobId/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { jobId, itemId } = req.params;
    const request = new sql.Request(pool);
    
    await request
      .input('itemId', sql.Int, itemId)
      .query(`DELETE FROM RateUserJobItems WHERE JobItemId = @itemId`);
    
    // Update job totals
    await recalculateJobTotals(parseInt(jobId));
    
    res.status(200).json({ message: 'Job item removed successfully' });
  } catch (error: any) {
    console.error('Error removing job item:', error);
    res.status(500).json({ error: 'Failed to remove job item' });
  }
});

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Rate Analysis Service running on port ${PORT}`);
  });
});
