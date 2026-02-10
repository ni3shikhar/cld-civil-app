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

export default apiClient;
