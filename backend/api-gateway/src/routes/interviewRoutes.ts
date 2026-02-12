import express from 'express';
import axios from 'axios';
import authMiddleware from '../middleware/auth';

const router = express.Router();
const INTERVIEW_SERVICE_URL = process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3003';

// Get all active questions
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${INTERVIEW_SERVICE_URL}/api/questions`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Admin: Get all questions (including inactive)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${INTERVIEW_SERVICE_URL}/api/questions/all`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Get questions summary/stats
router.get('/summary/stats', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${INTERVIEW_SERVICE_URL}/api/questions/summary/stats`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get questions by domain
router.get('/domain/:domain', async (req, res) => {
  try {
    const response = await axios.get(`${INTERVIEW_SERVICE_URL}/api/questions/domain/${req.params.domain}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get question by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${INTERVIEW_SERVICE_URL}/api/questions/${req.params.id}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Create question
router.post('/', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${INTERVIEW_SERVICE_URL}/api/questions`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Update question
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${INTERVIEW_SERVICE_URL}/api/questions/${req.params.id}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Delete question
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${INTERVIEW_SERVICE_URL}/api/questions/${req.params.id}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

export default router;
