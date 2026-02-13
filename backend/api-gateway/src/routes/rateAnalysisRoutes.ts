import express from 'express';
import axios from 'axios';
import authMiddleware from '../middleware/auth';

const router = express.Router();
const RATE_ANALYSIS_SERVICE_URL = process.env.RATE_ANALYSIS_SERVICE_URL || 'http://localhost:3005';

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// Get subscription plans
router.get('/plans', async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/plans`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// ==========================================
// USER SUBSCRIPTION ENDPOINTS (Authenticated)
// ==========================================

// Subscribe to rate analysis
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/subscribe`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get user's subscription status
router.get('/subscription/:userId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/subscription/${req.params.userId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Cancel subscription
router.post('/unsubscribe/:userId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/unsubscribe/${req.params.userId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// ==========================================
// RATE DATA ENDPOINTS (Authenticated with subscription)
// ==========================================

// Get rate categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/categories`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get rate items
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.categoryId) params.append('categoryId', req.query.categoryId as string);
    if (req.query.search) params.append('search', req.query.search as string);
    if (req.query.domain) params.append('domain', req.query.domain as string);
    
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/items?${params.toString()}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get single rate item
router.get('/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/items/${req.params.itemId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// Admin: Get all subscriptions
router.get('/admin/subscriptions', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/subscriptions`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Enable/Disable user access
router.patch('/admin/subscription/:subscriptionId/access', authMiddleware, async (req, res) => {
  try {
    const response = await axios.patch(
      `${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/subscription/${req.params.subscriptionId}/access`,
      req.body
    );
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Grant access to user
router.post('/admin/grant-access', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/grant-access`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Revoke access from user
router.post('/admin/revoke-access/:userId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/revoke-access/${req.params.userId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Get subscription summary
router.get('/admin/summary', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/summary`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Create rate item
router.post('/items', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/items`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Update rate item
router.put('/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/items/${req.params.itemId}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Delete rate item
router.delete('/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/items/${req.params.itemId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Create category
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/categories`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

export default router;
