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

// ==========================================
// MATERIAL RATES (Admin Configurable)
// ==========================================

// Get all materials
router.get('/materials', authMiddleware, async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.categoryId) params.append('categoryId', req.query.categoryId as string);
    if (req.query.search) params.append('search', req.query.search as string);
    
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/materials?${params.toString()}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Create material
router.post('/materials', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/materials`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Update material
router.put('/materials/:materialId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/materials/${req.params.materialId}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Delete material
router.delete('/materials/:materialId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/materials/${req.params.materialId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// ==========================================
// LABOR RATES (Admin Configurable)
// ==========================================

// Get all labor rates
router.get('/labor', authMiddleware, async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.skillLevel) params.append('skillLevel', req.query.skillLevel as string);
    if (req.query.search) params.append('search', req.query.search as string);
    
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/labor?${params.toString()}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Create labor rate
router.post('/labor', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/labor`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Update labor rate
router.put('/labor/:laborId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/labor/${req.params.laborId}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Delete labor rate
router.delete('/labor/:laborId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/labor/${req.params.laborId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// ==========================================
// MACHINERY RATES (Admin Configurable)
// ==========================================

// Get all machinery rates
router.get('/machinery', authMiddleware, async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.machineryType) params.append('machineryType', req.query.machineryType as string);
    if (req.query.search) params.append('search', req.query.search as string);
    
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/machinery?${params.toString()}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Create machinery rate
router.post('/machinery', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/machinery`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Update machinery rate
router.put('/machinery/:machineryId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/machinery/${req.params.machineryId}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Delete machinery rate
router.delete('/machinery/:machineryId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/machinery/${req.params.machineryId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// ==========================================
// COMPOSITE ITEMS (Admin creates using base rates)
// ==========================================

// Get all composite items (user view - total rate only)
router.get('/composite-items', authMiddleware, async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.categoryId) params.append('categoryId', req.query.categoryId as string);
    if (req.query.search) params.append('search', req.query.search as string);
    if (req.query.domain) params.append('domain', req.query.domain as string);
    
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/composite-items?${params.toString()}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Get all composite items with full breakdown
router.get('/admin/composite-items', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/composite-items`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Get single composite item with components
router.get('/admin/composite-items/:itemId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/composite-items/${req.params.itemId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Create composite item
router.post('/admin/composite-items', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/composite-items`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Update composite item
router.put('/admin/composite-items/:itemId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/composite-items/${req.params.itemId}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Delete composite item
router.delete('/admin/composite-items/:itemId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/composite-items/${req.params.itemId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Admin: Recalculate all rates
router.post('/admin/recalculate-rates', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/admin/recalculate-rates`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// ==========================================
// USER JOBS (Subscribed Users)
// ==========================================

// Get user's jobs
router.get('/jobs/:userId', authMiddleware, async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.status) params.append('status', req.query.status as string);
    
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/jobs/${req.params.userId}?${params.toString()}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Get single job with items
router.get('/jobs/:userId/:jobId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/jobs/${req.params.userId}/${req.params.jobId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Create new job
router.post('/jobs', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/jobs`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Update job
router.put('/jobs/:jobId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/jobs/${req.params.jobId}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Delete job
router.delete('/jobs/:jobId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/jobs/${req.params.jobId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Add item to job
router.post('/jobs/:jobId/items', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/jobs/${req.params.jobId}/items`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Update job item
router.put('/jobs/:jobId/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.put(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/jobs/${req.params.jobId}/items/${req.params.itemId}`, req.body);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

// Remove item from job
router.delete('/jobs/:jobId/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.delete(`${RATE_ANALYSIS_SERVICE_URL}/api/rate-analysis/jobs/${req.params.jobId}/items/${req.params.itemId}`);
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message });
  }
});

export default router;
