import express, { Request, Response } from 'express';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.JOB_SERVICE_PORT || 3002;

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
    console.log('Connected to SQL Server');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'Job Service is running' });
});

// Get all approved jobs with company info
app.get('/api/jobs', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT j.*, ep.CompanyName, ep.City as CompanyCity, ep.Website as CompanyWebsite
      FROM JobRequisitions j
      JOIN EmployerProfiles ep ON j.EmployerId = ep.EmployerId
      WHERE j.IsActive = 1 AND j.ApprovalStatus = 'Approved'
      ORDER BY j.PostingDate DESC
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get job by ID with company info
app.get('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('jobId', sql.Int, req.params.id)
      .query(`
        SELECT j.*, ep.CompanyName, ep.City as CompanyCity, ep.Website as CompanyWebsite
        FROM JobRequisitions j
        JOIN EmployerProfiles ep ON j.EmployerId = ep.EmployerId
        WHERE j.JobId = @jobId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Get jobs by employer (userId)
app.get('/api/jobs/employer/:userId', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, req.params.userId)
      .query(`
        SELECT j.*, ep.CompanyName,
          (SELECT COUNT(*) FROM JobApplications WHERE JobId = j.JobId) as ApplicationCount
        FROM JobRequisitions j
        JOIN EmployerProfiles ep ON j.EmployerId = ep.EmployerId
        WHERE ep.UserId = @userId
        ORDER BY j.PostingDate DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch employer jobs' });
  }
});

// Create job requisition
app.post('/api/jobs', async (req: Request, res: Response) => {
  try {
    const { userId, jobTitle, jobDescription, requiredSkills, civilDomain, salary, jobLocation } = req.body;

    // Get employerId from userId
    const empRequest = new sql.Request(pool);
    let empResult = await empRequest
      .input('userId', sql.Int, userId)
      .query('SELECT EmployerId FROM EmployerProfiles WHERE UserId = @userId');

    // Auto-create employer profile if not exists
    if (empResult.recordset.length === 0) {
      const createProfile = new sql.Request(pool);
      await createProfile
        .input('userId', sql.Int, userId)
        .query(`INSERT INTO EmployerProfiles (UserId, CompanyName) VALUES (@userId, 'My Company')`);
      
      const refetch = new sql.Request(pool);
      empResult = await refetch
        .input('userId', sql.Int, userId)
        .query('SELECT EmployerId FROM EmployerProfiles WHERE UserId = @userId');
    }

    const employerId = empResult.recordset[0].EmployerId;

    const request = new sql.Request(pool);
    const result = await request
      .input('employerId', sql.Int, employerId)
      .input('jobTitle', sql.VarChar, jobTitle)
      .input('jobDescription', sql.Text, jobDescription)
      .input('requiredSkills', sql.VarChar(sql.MAX), requiredSkills)
      .input('civilDomain', sql.VarChar, civilDomain)
      .input('salary', sql.Decimal, salary || 0)
      .input('jobLocation', sql.VarChar, jobLocation)
      .query(`
        INSERT INTO JobRequisitions (EmployerId, JobTitle, JobDescription, RequiredSkills, CivilDomain, Salary, JobLocation, ApprovalStatus)
        OUTPUT INSERTED.JobId
        VALUES (@employerId, @jobTitle, @jobDescription, @requiredSkills, @civilDomain, @salary, @jobLocation, 'Approved')
      `);

    res.status(201).json({ message: 'Job created successfully', jobId: result.recordset[0].JobId });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Admin: Get all jobs (including pending/rejected)
app.get('/api/jobs/admin/all', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT j.*, ep.CompanyName, u.FirstName + ' ' + u.LastName as EmployerName,
        (SELECT COUNT(*) FROM JobApplications WHERE JobId = j.JobId) as ApplicationCount
      FROM JobRequisitions j
      JOIN EmployerProfiles ep ON j.EmployerId = ep.EmployerId
      JOIN Users u ON ep.UserId = u.UserId
      ORDER BY j.PostingDate DESC
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Admin: Get pending job approvals
app.get('/api/jobs/admin/pending', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT j.*, ep.CompanyName, u.FirstName + ' ' + u.LastName as EmployerName
      FROM JobRequisitions j
      JOIN EmployerProfiles ep ON j.EmployerId = ep.EmployerId
      JOIN Users u ON ep.UserId = u.UserId
      WHERE j.ApprovalStatus = 'Pending'
      ORDER BY j.PostingDate ASC
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch pending jobs' });
  }
});

// Admin: Get job approval summary
app.get('/api/jobs/admin/summary', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT 
        COUNT(*) as TotalJobs,
        SUM(CASE WHEN ApprovalStatus = 'Pending' THEN 1 ELSE 0 END) as PendingCount,
        SUM(CASE WHEN ApprovalStatus = 'Approved' THEN 1 ELSE 0 END) as ApprovedCount,
        SUM(CASE WHEN ApprovalStatus = 'Rejected' THEN 1 ELSE 0 END) as RejectedCount,
        SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) as ActiveCount
      FROM JobRequisitions
    `);
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Admin: Get top 5 job locations
app.get('/api/jobs/admin/locations', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT TOP 5
        JobLocation,
        COUNT(*) as JobCount,
        SUM(CASE WHEN ApprovalStatus = 'Approved' THEN 1 ELSE 0 END) as ApprovedCount,
        SUM(CASE WHEN ApprovalStatus = 'Pending' THEN 1 ELSE 0 END) as PendingCount
      FROM JobRequisitions
      WHERE JobLocation IS NOT NULL AND JobLocation != ''
      GROUP BY JobLocation
      ORDER BY JobCount DESC
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Admin: Update job approval status
app.patch('/api/jobs/:id/approval', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: Pending, Approved, or Rejected' });
    }

    const request = new sql.Request(pool);
    await request
      .input('jobId', sql.Int, req.params.id)
      .input('status', sql.VarChar, status)
      .input('isActive', sql.Bit, status === 'Approved' ? 1 : 0)
      .query('UPDATE JobRequisitions SET ApprovalStatus = @status, IsActive = @isActive, UpdatedDate = GETDATE() WHERE JobId = @jobId');

    res.status(200).json({ message: 'Job approval status updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

// Admin: Delete job
app.delete('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    await request
      .input('jobId', sql.Int, req.params.id)
      .query('UPDATE JobRequisitions SET IsActive = 0, ApprovalStatus = \'Rejected\' WHERE JobId = @jobId');

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Job Service running on port ${PORT}`);
  });
});

export default app;
