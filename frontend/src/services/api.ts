import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: (data: any) => apiClient.post('/users/register', data),
  login: (data: any) => apiClient.post('/users/login', data),
  getProfile: (id: string) => apiClient.get(`/users/${id}`),
  updateProfile: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  changePassword: (id: string, data: { currentPassword: string; newPassword: string }) => 
    apiClient.post(`/users/${id}/change-password`, data),
  // Resume management
  uploadResume: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return apiClient.post(`/users/${id}/resume`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getResumeInfo: (id: string) => apiClient.get(`/users/${id}/resume/info`),
  downloadResume: (id: string) => 
    apiClient.get(`/users/${id}/resume`, { responseType: 'blob' }),
  deleteResume: (id: string) => apiClient.delete(`/users/${id}/resume`),
};

export const jobService = {
  getJobs: () => apiClient.get('/jobs'),
  getJobById: (id: string) => apiClient.get(`/jobs/${id}`),
  getEmployerJobs: (userId: string) => apiClient.get(`/jobs/employer/${userId}`),
  createJob: (data: any) => apiClient.post('/jobs', data),
  updateJob: (id: string, data: any) => apiClient.put(`/jobs/${id}`, data),
  deleteJob: (id: string) => apiClient.delete(`/jobs/${id}`),
  // Admin
  getAllJobs: () => apiClient.get('/jobs/admin/all'),
  getPendingJobs: () => apiClient.get('/jobs/admin/pending'),
  getJobSummary: () => apiClient.get('/jobs/admin/summary'),
  getTopLocations: () => apiClient.get('/jobs/admin/locations'),
  updateJobApproval: (id: string, status: string) => apiClient.patch(`/jobs/${id}/approval`, { status }),
};

export const questionService = {
  getQuestions: () => apiClient.get('/questions'),
  getQuestionsByDomain: (domain: string) => apiClient.get(`/questions/domain/${domain}`),
  createQuestion: (data: any) => apiClient.post('/questions', data),
  // Admin
  getAllQuestions: () => apiClient.get('/questions/all'),
  getQuestionSummary: () => apiClient.get('/questions/summary/stats'),
  getQuestionById: (id: string) => apiClient.get(`/questions/${id}`),
  updateQuestion: (id: string, data: any) => apiClient.put(`/questions/${id}`, data),
  deleteQuestion: (id: string) => apiClient.delete(`/questions/${id}`),
};

export const userService = {
  getAllUsers: () => apiClient.get('/users'),
  getUserSummary: () => apiClient.get('/users/summary'),
  getUserById: (id: string) => apiClient.get(`/users/${id}`),
  updateUser: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
};

export const applicationService = {
  getApplications: () => apiClient.get('/applications'),
  submitApplication: (data: any) => apiClient.post('/applications', data),
  getStudentApplications: (studentId: string) => apiClient.get(`/applications/student/${studentId}`),
  getUserApplications: (userId: string) => apiClient.get(`/applications/user/${userId}`),
  getEmployerApplications: (userId: string) => apiClient.get(`/applications/employer/${userId}`),
  updateApplicationStatus: (id: string, status: string) => apiClient.patch(`/applications/${id}/status`, { status }),
};

export const rateAnalysisService = {
  // Public
  getPlans: () => apiClient.get('/rate-analysis/plans'),
  
  // User subscription
  subscribe: (data: { userId: number; planId?: number }) => apiClient.post('/rate-analysis/subscribe', data),
  getSubscription: (userId: string) => apiClient.get(`/rate-analysis/subscription/${userId}`),
  unsubscribe: (userId: string) => apiClient.post(`/rate-analysis/unsubscribe/${userId}`),
  
  // Rate data (requires active subscription)
  getCategories: () => apiClient.get('/rate-analysis/categories'),
  getItems: (params?: { categoryId?: number; search?: string; domain?: string }) => 
    apiClient.get('/rate-analysis/items', { params }),
  getItemById: (itemId: string) => apiClient.get(`/rate-analysis/items/${itemId}`),
  
  // Admin - Subscription management
  getAllSubscriptions: () => apiClient.get('/rate-analysis/admin/subscriptions'),
  getSubscriptionSummary: () => apiClient.get('/rate-analysis/admin/summary'),
  enableAccess: (subscriptionId: number, isEnabled: boolean) => 
    apiClient.patch(`/rate-analysis/admin/subscription/${subscriptionId}/access`, { isEnabled }),
  grantAccess: (data: { userId: number; planId?: number; durationDays?: number }) => 
    apiClient.post('/rate-analysis/admin/grant-access', data),
  revokeAccess: (userId: number) => apiClient.post(`/rate-analysis/admin/revoke-access/${userId}`),
  
  // Admin - Rate data management
  createItem: (data: any) => apiClient.post('/rate-analysis/items', data),
  updateItem: (itemId: string, data: any) => apiClient.put(`/rate-analysis/items/${itemId}`, data),
  deleteItem: (itemId: string) => apiClient.delete(`/rate-analysis/items/${itemId}`),
  createCategory: (data: any) => apiClient.post('/rate-analysis/categories', data),
  
  // Admin - Material rates
  getMaterials: (params?: { categoryId?: number; search?: string }) => 
    apiClient.get('/rate-analysis/materials', { params }),
  createMaterial: (data: any) => apiClient.post('/rate-analysis/materials', data),
  updateMaterial: (materialId: number, data: any) => apiClient.put(`/rate-analysis/materials/${materialId}`, data),
  deleteMaterial: (materialId: number) => apiClient.delete(`/rate-analysis/materials/${materialId}`),
  
  // Admin - Labor rates
  getLabor: (params?: { skillLevel?: string; search?: string }) => 
    apiClient.get('/rate-analysis/labor', { params }),
  createLabor: (data: any) => apiClient.post('/rate-analysis/labor', data),
  updateLabor: (laborId: number, data: any) => apiClient.put(`/rate-analysis/labor/${laborId}`, data),
  deleteLabor: (laborId: number) => apiClient.delete(`/rate-analysis/labor/${laborId}`),
  
  // Admin - Machinery rates
  getMachinery: (params?: { machineryType?: string; search?: string }) => 
    apiClient.get('/rate-analysis/machinery', { params }),
  createMachinery: (data: any) => apiClient.post('/rate-analysis/machinery', data),
  updateMachinery: (machineryId: number, data: any) => apiClient.put(`/rate-analysis/machinery/${machineryId}`, data),
  deleteMachinery: (machineryId: number) => apiClient.delete(`/rate-analysis/machinery/${machineryId}`),
  
  // Admin - Composite items
  getCompositeItems: (params?: { categoryId?: number; search?: string; domain?: string }) => 
    apiClient.get('/rate-analysis/composite-items', { params }),
  getAdminCompositeItems: () => apiClient.get('/rate-analysis/admin/composite-items'),
  getAdminCompositeItem: (itemId: number) => apiClient.get(`/rate-analysis/admin/composite-items/${itemId}`),
  createCompositeItem: (data: any) => apiClient.post('/rate-analysis/admin/composite-items', data),
  updateCompositeItem: (itemId: number, data: any) => apiClient.put(`/rate-analysis/admin/composite-items/${itemId}`, data),
  deleteCompositeItem: (itemId: number) => apiClient.delete(`/rate-analysis/admin/composite-items/${itemId}`),
  recalculateRates: () => apiClient.post('/rate-analysis/admin/recalculate-rates'),
  
  // User jobs
  getUserJobs: (userId: string, params?: { status?: string }) => 
    apiClient.get(`/rate-analysis/jobs/${userId}`, { params }),
  getUserJob: (userId: string, jobId: number) => apiClient.get(`/rate-analysis/jobs/${userId}/${jobId}`),
  createUserJob: (data: any) => apiClient.post('/rate-analysis/jobs', data),
  updateUserJob: (jobId: number, data: any) => apiClient.put(`/rate-analysis/jobs/${jobId}`, data),
  deleteUserJob: (jobId: number) => apiClient.delete(`/rate-analysis/jobs/${jobId}`),
  addJobItem: (jobId: number, data: any) => apiClient.post(`/rate-analysis/jobs/${jobId}/items`, data),
  updateJobItem: (jobId: number, itemId: number, data: any) => apiClient.put(`/rate-analysis/jobs/${jobId}/items/${itemId}`, data),
  removeJobItem: (jobId: number, itemId: number) => apiClient.delete(`/rate-analysis/jobs/${jobId}/items/${itemId}`),
};

export default apiClient;
