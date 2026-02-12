import express, { Request, Response } from 'express';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.APPLICATION_SERVICE_PORT || 3004;

app.use(express.json());

// SQL Server Configuration
const sqlConfig: sql.config = {
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
  res.status(200).json({ status: 'Application Service is running' });
});

// Get all applications
app.get('/api/applications', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query('SELECT * FROM JobApplications');
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Submit application
app.post('/api/applications', async (req: Request, res: Response) => {
  try {
    const { jobId, userId, coverLetter } = req.body;

    // Check if already applied
    const checkRequest = new sql.Request(pool);
    const existing = await checkRequest
      .input('jobId', sql.Int, jobId)
      .input('userId', sql.Int, userId)
      .query('SELECT ApplicationId FROM JobApplications WHERE JobId = @jobId AND UserId = @userId');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const request = new sql.Request(pool);
    const result = await request
      .input('jobId2', sql.Int, jobId)
      .input('userId2', sql.Int, userId)
      .input('coverLetter', sql.Text, coverLetter || '')
      .query(`
        INSERT INTO JobApplications (JobId, StudentId, UserId, CoverLetter)
        OUTPUT INSERTED.ApplicationId
        VALUES (@jobId2, @userId2, @userId2, @coverLetter)
      `);

    res.status(201).json({ 
      message: 'Application submitted successfully',
      applicationId: result.recordset[0].ApplicationId
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get student applications by studentId
app.get('/api/applications/student/:studentId', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('studentId', sql.Int, req.params.studentId)
      .query(`
        SELECT a.*, j.JobTitle, j.JobLocation, j.CivilDomain, ep.CompanyName
        FROM JobApplications a
        JOIN JobRequisitions j ON a.JobId = j.JobId
        JOIN EmployerProfiles ep ON j.EmployerId = ep.EmployerId
        WHERE a.StudentId = @studentId
        ORDER BY a.AppliedDate DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications by userId
app.get('/api/applications/user/:userId', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, req.params.userId)
      .query(`
        SELECT a.*, j.JobTitle, j.JobLocation, j.CivilDomain, ep.CompanyName
        FROM JobApplications a
        JOIN JobRequisitions j ON a.JobId = j.JobId
        JOIN EmployerProfiles ep ON j.EmployerId = ep.EmployerId
        WHERE a.UserId = @userId
        ORDER BY a.AppliedDate DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications for employer's jobs
app.get('/api/applications/employer/:userId', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, req.params.userId)
      .query(`
        SELECT a.ApplicationId, a.JobId, a.ApplicationStatus as Status, a.AppliedDate, a.CoverLetter,
               j.JobTitle, j.JobLocation, j.CivilDomain,
               u.FirstName, u.LastName, u.Email,
               sp.UniversityName as University, sp.GraduationYear, sp.CGPA as GPA, sp.Skills
        FROM JobApplications a
        JOIN JobRequisitions j ON a.JobId = j.JobId
        JOIN EmployerProfiles ep ON j.EmployerId = ep.EmployerId
        JOIN Users u ON a.UserId = u.UserId
        LEFT JOIN StudentProfiles sp ON a.UserId = sp.UserId
        WHERE ep.UserId = @userId
        ORDER BY a.AppliedDate DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch employer applications' });
  }
});

// Update application status
app.patch('/api/applications/:applicationId/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Submitted', 'Under Review', 'Shortlisted', 'Rejected', 'Accepted'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = new sql.Request(pool);
    await request
      .input('applicationId', sql.Int, req.params.applicationId)
      .input('status', sql.VarChar, status)
      .query('UPDATE JobApplications SET ApplicationStatus = @status WHERE ApplicationId = @applicationId');

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Application Service running on port ${PORT}`);
  });
});

export default app;
