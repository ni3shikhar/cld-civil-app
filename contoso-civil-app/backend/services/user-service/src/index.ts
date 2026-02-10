import express, { Request, Response } from 'express';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

dotenv.config();

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  },
});

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

// Azure Blob Storage Configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'resumes';

let containerClient: ContainerClient | null = null;

// Initialize Azure Blob Storage client
async function initializeBlobStorage() {
  if (AZURE_STORAGE_CONNECTION_STRING) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
      containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
      
      // Create container if it doesn't exist
      await containerClient.createIfNotExists();
      console.log(`Azure Blob Storage initialized (container: ${AZURE_STORAGE_CONTAINER_NAME})`);
    } catch (error) {
      console.warn('Azure Blob Storage initialization failed:', error);
      console.warn('Resume upload will be disabled');
    }
  } else {
    console.warn('AZURE_STORAGE_CONNECTION_STRING not set, resume upload will be disabled');
  }
}

app.use(express.json());

// SQL Server Configuration
const sqlConfig: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourSQLPassword123!',
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ContosoCivilApp',
  port: parseInt(process.env.DB_PORT || '1433'),
  connectionTimeout: 30000,
  requestTimeout: 30000,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool;

// Initialize database connection
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

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'User Service is running' });
});

// Register user
app.post('/api/users/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'All fields are required: email, password, firstName, lastName, role' });
    }

    // Check if email already exists
    const checkEmail = new sql.Request(pool);
    const emailCheck = await checkEmail
      .input('email', sql.VarChar, email)
      .query('SELECT UserId FROM Users WHERE Email = @email');

    if (emailCheck.recordset.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Look up roleId from role name (case-insensitive)
    const roleRequest = new sql.Request(pool);
    const roleResult = await roleRequest
      .input('roleName', sql.VarChar, role)
      .query('SELECT RoleId FROM UserRoles WHERE LOWER(RoleName) = LOWER(@roleName)');

    if (roleResult.recordset.length === 0) {
      return res.status(400).json({ error: `Invalid role: ${role}. Valid roles are: Student, Employer, Administrator` });
    }

    const roleId = roleResult.recordset[0].RoleId;
    const hashedPassword = await bcrypt.hash(password, 10);

    const request = new sql.Request(pool);
    const result = await request
      .input('email', sql.VarChar, email)
      .input('passwordHash', sql.VarChar(sql.MAX), hashedPassword)
      .input('firstName', sql.VarChar, firstName)
      .input('lastName', sql.VarChar, lastName)
      .input('roleId', sql.Int, roleId)
      .query(`
        INSERT INTO Users (Email, PasswordHash, FirstName, LastName, RoleId)
        OUTPUT INSERTED.UserId
        VALUES (@email, @passwordHash, @firstName, @lastName, @roleId)
      `);

    const newUserId = result.recordset[0].UserId;

    // Create profile based on role
    if (role.toLowerCase() === 'employer') {
      const profileRequest = new sql.Request(pool);
      await profileRequest
        .input('userId', sql.Int, newUserId)
        .input('companyName', sql.VarChar, `${firstName}'s Company`)
        .query(`INSERT INTO EmployerProfiles (UserId, CompanyName) VALUES (@userId, @companyName)`);
    } else if (role.toLowerCase() === 'student') {
      const profileRequest = new sql.Request(pool);
      await profileRequest
        .input('studentId', sql.Int, newUserId)
        .input('userId', sql.Int, newUserId)
        .query(`INSERT INTO StudentProfiles (StudentId, UserId) VALUES (@studentId, @userId)`);
    }

    res.status(201).json({ message: 'User registered successfully', userId: newUserId });
  } catch (error: any) {
    console.error('Registration error:', error);
    const errorMessage = error.message || 'Registration failed';
    res.status(500).json({ error: errorMessage });
  }
});

// Login user
app.post('/api/users/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const request = new sql.Request(pool);
    const result = await request
      .input('email', sql.VarChar, email)
      .query(`
        SELECT u.UserId, u.PasswordHash, u.FirstName, u.LastName, u.RoleId, r.RoleName 
        FROM Users u 
        JOIN UserRoles r ON u.RoleId = r.RoleId 
        WHERE u.Email = @email AND u.IsActive = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.recordset[0];
    const validPassword = await bcrypt.compare(password, user.PasswordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.UserId, roleId: user.RoleId, role: user.RoleName },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      token, 
      userId: user.UserId, 
      roleId: user.RoleId, 
      role: user.RoleName,
      firstName: user.FirstName,
      lastName: user.LastName
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin: Get all users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT u.UserId, u.Email, u.FirstName, u.LastName, u.IsActive, u.CreatedDate, u.UpdatedDate,
             r.RoleName, r.RoleId
      FROM Users u
      JOIN UserRoles r ON u.RoleId = r.RoleId
      ORDER BY u.CreatedDate DESC
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Get user summary
app.get('/api/users/summary', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT 
        COUNT(*) as TotalUsers,
        SUM(CASE WHEN r.RoleName = 'Student' THEN 1 ELSE 0 END) as StudentCount,
        SUM(CASE WHEN r.RoleName = 'Employer' THEN 1 ELSE 0 END) as EmployerCount,
        SUM(CASE WHEN r.RoleName = 'Administrator' THEN 1 ELSE 0 END) as AdminCount,
        SUM(CASE WHEN u.IsActive = 1 THEN 1 ELSE 0 END) as ActiveUsers
      FROM Users u
      JOIN UserRoles r ON u.RoleId = r.RoleId
    `);
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Admin: Get user by ID
app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, req.params.id)
      .query(`
        SELECT u.UserId, u.Email, u.FirstName, u.LastName, u.IsActive, u.CreatedDate, u.UpdatedDate,
               r.RoleName, r.RoleId
        FROM Users u
        JOIN UserRoles r ON u.RoleId = r.RoleId
        WHERE u.UserId = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Admin: Update user
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, roleId, isActive } = req.body;

    const request = new sql.Request(pool);
    await request
      .input('userId', sql.Int, req.params.id)
      .input('firstName', sql.VarChar, firstName)
      .input('lastName', sql.VarChar, lastName)
      .input('roleId', sql.Int, roleId)
      .input('isActive', sql.Bit, isActive !== undefined ? isActive : true)
      .query(`
        UPDATE Users 
        SET FirstName = @firstName, LastName = @lastName, RoleId = @roleId, IsActive = @isActive, UpdatedDate = GETDATE()
        WHERE UserId = @userId
      `);

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin: Delete user (soft delete)
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    await request
      .input('userId', sql.Int, req.params.id)
      .query('UPDATE Users SET IsActive = 0 WHERE UserId = @userId');

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Change password
app.post('/api/users/:id/change-password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current user's password hash
    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, userId)
      .query('SELECT PasswordHash FROM Users WHERE UserId = @userId AND IsActive = 1');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, result.recordset[0].PasswordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const updateRequest = new sql.Request(pool);
    await updateRequest
      .input('userId', sql.Int, userId)
      .input('passwordHash', sql.VarChar, newPasswordHash)
      .query('UPDATE Users SET PasswordHash = @passwordHash, UpdatedDate = GETDATE() WHERE UserId = @userId');

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Upload resume (Students only) - Stores in Azure Blob Storage
app.post('/api/users/:id/resume', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    if (!containerClient) {
      return res.status(503).json({ error: 'Resume storage is not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user is a student
    const checkRequest = new sql.Request(pool);
    const checkResult = await checkRequest
      .input('userId', sql.Int, userId)
      .query(`
        SELECT u.UserId, r.RoleName, sp.ResumeBlobName
        FROM Users u 
        JOIN UserRoles r ON u.RoleId = r.RoleId 
        LEFT JOIN StudentProfiles sp ON u.UserId = sp.UserId
        WHERE u.UserId = @userId
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (checkResult.recordset[0].RoleName !== 'Student') {
      return res.status(403).json({ error: 'Only students can upload resumes' });
    }

    // Delete old blob if exists
    const oldBlobName = checkResult.recordset[0].ResumeBlobName;
    if (oldBlobName) {
      try {
        const oldBlobClient = containerClient.getBlockBlobClient(oldBlobName);
        await oldBlobClient.deleteIfExists();
      } catch (e) {
        console.warn('Failed to delete old blob:', e);
      }
    }

    // Generate unique blob name
    const fileExtension = req.file.originalname.split('.').pop();
    const blobName = `user-${userId}-${Date.now()}.${fileExtension}`;

    // Upload to Azure Blob Storage
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: {
        blobContentType: req.file.mimetype,
        blobContentDisposition: `attachment; filename="${req.file.originalname}"`
      }
    });

    // Update StudentProfiles with blob reference
    const request = new sql.Request(pool);
    await request
      .input('userId', sql.Int, userId)
      .input('blobName', sql.VarChar(500), blobName)
      .input('fileName', sql.VarChar(255), req.file.originalname)
      .query(`
        UPDATE StudentProfiles 
        SET ResumeBlobName = @blobName, ResumeFileName = @fileName, UpdatedDate = GETDATE()
        WHERE UserId = @userId
      `);

    res.status(200).json({ 
      message: 'Resume uploaded successfully',
      fileName: req.file.originalname
    });
  } catch (error: any) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload resume' });
  }
});

// Download resume from Azure Blob Storage
app.get('/api/users/:id/resume', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    if (!containerClient) {
      return res.status(503).json({ error: 'Resume storage is not configured' });
    }

    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, userId)
      .query(`
        SELECT ResumeBlobName, ResumeFileName 
        FROM StudentProfiles 
        WHERE UserId = @userId
      `);

    if (result.recordset.length === 0 || !result.recordset[0].ResumeBlobName) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const { ResumeBlobName, ResumeFileName } = result.recordset[0];
    
    // Download from Azure Blob Storage
    const blockBlobClient = containerClient.getBlockBlobClient(ResumeBlobName);
    const downloadResponse = await blockBlobClient.download();
    
    // Determine content type
    let contentType = downloadResponse.contentType || 'application/octet-stream';
    if (ResumeFileName?.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (ResumeFileName?.endsWith('.doc')) {
      contentType = 'application/msword';
    } else if (ResumeFileName?.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${ResumeFileName || 'resume'}"`);
    
    // Stream the blob to response
    if (downloadResponse.readableStreamBody) {
      downloadResponse.readableStreamBody.pipe(res);
    } else {
      res.status(500).json({ error: 'Failed to read resume file' });
    }
  } catch (error: any) {
    console.error('Resume download error:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Resume file not found in storage' });
    }
    res.status(500).json({ error: 'Failed to download resume' });
  }
});

// Get resume info (check if resume exists)
app.get('/api/users/:id/resume/info', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, userId)
      .query(`
        SELECT ResumeFileName, ResumeBlobName, UpdatedDate
        FROM StudentProfiles 
        WHERE UserId = @userId AND ResumeBlobName IS NOT NULL
      `);

    if (result.recordset.length === 0 || !result.recordset[0].ResumeBlobName) {
      return res.status(200).json({ hasResume: false });
    }

    res.status(200).json({ 
      hasResume: true,
      fileName: result.recordset[0].ResumeFileName,
      updatedDate: result.recordset[0].UpdatedDate
    });
  } catch (error) {
    console.error('Resume info error:', error);
    res.status(500).json({ error: 'Failed to get resume info' });
  }
});

// Delete resume from Azure Blob Storage
app.delete('/api/users/:id/resume', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    if (!containerClient) {
      return res.status(503).json({ error: 'Resume storage is not configured' });
    }

    // Get current blob name
    const getRequest = new sql.Request(pool);
    const getResult = await getRequest
      .input('userId', sql.Int, userId)
      .query(`SELECT ResumeBlobName FROM StudentProfiles WHERE UserId = @userId`);

    if (getResult.recordset.length > 0 && getResult.recordset[0].ResumeBlobName) {
      // Delete from Azure Blob Storage
      const blockBlobClient = containerClient.getBlockBlobClient(getResult.recordset[0].ResumeBlobName);
      await blockBlobClient.deleteIfExists();
    }

    // Update database
    const request = new sql.Request(pool);
    await request
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE StudentProfiles 
        SET ResumeBlobName = NULL, ResumeFileName = NULL, UpdatedDate = GETDATE()
        WHERE UserId = @userId
      `);

    res.status(200).json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Resume delete error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// Start server
initializeDatabase().then(async () => {
  await initializeBlobStorage();
  app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
  });
});

export default app;
