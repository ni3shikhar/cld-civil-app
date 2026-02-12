import express, { Request, Response } from 'express';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.INTERVIEW_SERVICE_PORT || 3003;

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
  res.status(200).json({ status: 'Interview Service is running' });
});

// Get all questions
app.get('/api/questions', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query('SELECT * FROM InterviewQuestions WHERE IsActive = 1');
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get questions by domain
app.get('/api/questions/domain/:domain', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('domain', sql.VarChar, req.params.domain)
      .query('SELECT * FROM InterviewQuestions WHERE CivilDomain = @domain AND IsActive = 1');

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get all questions (admin - includes inactive)
app.get('/api/questions/all', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT q.*, u.FirstName + ' ' + u.LastName as CreatedByName
      FROM InterviewQuestions q
      LEFT JOIN Users u ON q.CreatedBy = u.UserId
      ORDER BY q.CreatedDate DESC
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get question by ID
app.get('/api/questions/:id', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('questionId', sql.Int, req.params.id)
      .query('SELECT * FROM InterviewQuestions WHERE QuestionId = @questionId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// Create question
app.post('/api/questions', async (req: Request, res: Response) => {
  try {
    const { createdBy, civilDomain, questionCategory, questionText, correctAnswer, explanation, difficultyLevel } = req.body;

    const request = new sql.Request(pool);
    const result = await request
      .input('createdBy', sql.Int, createdBy)
      .input('civilDomain', sql.VarChar, civilDomain)
      .input('questionCategory', sql.VarChar, questionCategory)
      .input('questionText', sql.Text, questionText)
      .input('correctAnswer', sql.Text, correctAnswer)
      .input('explanation', sql.Text, explanation || '')
      .input('difficultyLevel', sql.VarChar, difficultyLevel)
      .query(`
        INSERT INTO InterviewQuestions (CreatedBy, CivilDomain, QuestionCategory, QuestionText, CorrectAnswer, Explanation, DifficultyLevel)
        OUTPUT INSERTED.QuestionId
        VALUES (@createdBy, @civilDomain, @questionCategory, @questionText, @correctAnswer, @explanation, @difficultyLevel)
      `);

    res.status(201).json({ message: 'Question created successfully', questionId: result.recordset[0].QuestionId });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Update question
app.put('/api/questions/:id', async (req: Request, res: Response) => {
  try {
    const { civilDomain, questionCategory, questionText, correctAnswer, explanation, difficultyLevel, isActive } = req.body;

    const request = new sql.Request(pool);
    await request
      .input('questionId', sql.Int, req.params.id)
      .input('civilDomain', sql.VarChar, civilDomain)
      .input('questionCategory', sql.VarChar, questionCategory)
      .input('questionText', sql.Text, questionText)
      .input('correctAnswer', sql.Text, correctAnswer)
      .input('explanation', sql.Text, explanation || '')
      .input('difficultyLevel', sql.VarChar, difficultyLevel)
      .input('isActive', sql.Bit, isActive !== undefined ? isActive : true)
      .query(`
        UPDATE InterviewQuestions 
        SET CivilDomain = @civilDomain, QuestionCategory = @questionCategory, QuestionText = @questionText,
            CorrectAnswer = @correctAnswer, Explanation = @explanation, DifficultyLevel = @difficultyLevel,
            IsActive = @isActive, UpdatedDate = GETDATE()
        WHERE QuestionId = @questionId
      `);

    res.status(200).json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question (soft delete)
app.delete('/api/questions/:id', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    await request
      .input('questionId', sql.Int, req.params.id)
      .query('UPDATE InterviewQuestions SET IsActive = 0 WHERE QuestionId = @questionId');

    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Get questions summary by domain
app.get('/api/questions/summary/stats', async (req: Request, res: Response) => {
  try {
    const request = new sql.Request(pool);
    const result = await request.query(`
      SELECT 
        CivilDomain,
        COUNT(*) as TotalQuestions,
        SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) as ActiveQuestions,
        SUM(CASE WHEN DifficultyLevel = 'Easy' THEN 1 ELSE 0 END) as EasyCount,
        SUM(CASE WHEN DifficultyLevel = 'Medium' THEN 1 ELSE 0 END) as MediumCount,
        SUM(CASE WHEN DifficultyLevel = 'Hard' THEN 1 ELSE 0 END) as HardCount
      FROM InterviewQuestions
      GROUP BY CivilDomain
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Interview Service running on port ${PORT}`);
  });
});

export default app;
