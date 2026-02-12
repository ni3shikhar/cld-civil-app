import express from 'express';
import axios from 'axios';
import authMiddleware from '../middleware/auth';

const router = express.Router();
const APPLICATION_SERVICE_URL = process.env.APPLICATION_SERVICE_URL || 'http://localhost:3004';

// Get all applications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${APPLICATION_SERVICE_URL}/api/applications`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Submit application
router.post('/', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${APPLICATION_SERVICE_URL}/api/applications`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
  }
});

// Get applications by student ID
router.get('/student/:studentId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${APPLICATION_SERVICE_URL}/api/applications/student/${req.params.studentId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Get applications by user ID
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${APPLICATION_SERVICE_URL}/api/applications/user/${req.params.userId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Get applications for employer's jobs
router.get('/employer/:userId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${APPLICATION_SERVICE_URL}/api/applications/employer/${req.params.userId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Update application status
router.patch('/:applicationId/status', authMiddleware, async (req, res) => {
  try {
    const response = await axios.patch(`${APPLICATION_SERVICE_URL}/api/applications/${req.params.applicationId}/status`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

export default router;
