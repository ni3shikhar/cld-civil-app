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

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Rate Analysis Service running on port ${PORT}`);
  });
});
