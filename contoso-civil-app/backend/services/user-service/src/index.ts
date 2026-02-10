import express, { Request, Response } from 'express';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

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

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
  });
});

export default app;
