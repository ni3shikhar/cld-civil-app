import express from 'express';
import axios from 'axios';
import authMiddleware from '../middleware/auth';

const router = express.Router();
const JOB_SERVICE_URL = process.env.JOB_SERVICE_URL || 'http://localhost:3002';

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${JOB_SERVICE_URL}/api/jobs`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Get jobs by employer
router.get('/employer/:userId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${JOB_SERVICE_URL}/api/jobs/employer/${req.params.userId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Create job requisition
router.post('/', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${JOB_SERVICE_URL}/api/jobs`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Admin: Get all jobs
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${JOB_SERVICE_URL}/api/jobs/admin/all`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Get pending jobs
router.get('/admin/pending', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${JOB_SERVICE_URL}/api/jobs/admin/pending`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Get job summary
router.get('/admin/summary', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${JOB_SERVICE_URL}/api/jobs/admin/summary`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Get top 5 job locations
router.get('/admin/locations', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${JOB_SERVICE_URL}/api/jobs/admin/locations`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Update job approval status
router.patch('/:id/approval', authMiddleware, async (req, res) => {
  try {
    const response = await axios.patch(`${JOB_SERVICE_URL}/api/jobs/${req.params.id}/approval`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Delete job
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${JOB_SERVICE_URL}/api/jobs/${req.params.id}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const response = await axios.get(`${JOB_SERVICE_URL}/api/jobs/${req.params.id}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

export default router;
