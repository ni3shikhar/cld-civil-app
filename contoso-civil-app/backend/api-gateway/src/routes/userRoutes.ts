import express from 'express';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import authMiddleware from '../middleware/auth';

const router = express.Router();
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  },
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const response = await axios.post(`${USER_SERVICE_URL}/api/users/register`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || error.message;
    res.status(status).json({ error: message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const response = await axios.post(`${USER_SERVICE_URL}/api/users/login`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || error.message;
    res.status(status).json({ error: message });
  }
});

// Admin: Get all users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Get user summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/summary`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get user profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${req.params.id}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Update user profile
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${USER_SERVICE_URL}/api/users/${req.params.id}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Delete user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${USER_SERVICE_URL}/api/users/${req.params.id}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Change password
router.post('/:id/change-password', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${USER_SERVICE_URL}/api/users/${req.params.id}/change-password`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Upload resume
router.post('/:id/resume', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('resume', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      `${USER_SERVICE_URL}/api/users/${req.params.id}/resume`,
      formData,
      { headers: { ...formData.getHeaders() } }
    );
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get resume info
router.get('/:id/resume/info', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${req.params.id}/resume/info`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Download resume
router.get('/:id/resume', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${req.params.id}/resume`, {
      responseType: 'arraybuffer',
    });
    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', response.headers['content-disposition']);
    res.send(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Delete resume
router.delete('/:id/resume', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${USER_SERVICE_URL}/api/users/${req.params.id}/resume`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

export default router;
