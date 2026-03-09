import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://secure-document-vault.onrender.com/api');

// Main API client with authentication
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
});

// Public API client without authentication (for shared documents)
const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData && config.headers['Content-Type']) {
    delete config.headers['Content-Type'];
  }
  return config;
}, (error) => Promise.reject(error));

apiClient.interceptors.response.use((response) => response, async (error) => {
  const originalRequest = error.config;

  // Log API errors for debugging
  if (error.response) {
    console.error(`[API Error] ${originalRequest.method?.toUpperCase()} ${originalRequest.url}:`, {
      status: error.response.status,
      message: error.response.data?.message,
      data: error.response.data
    });
  } else if (error.request) {
    console.error(`[API Error] No response for ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`);
  }

  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.warn('[API] No refresh token found, redirecting to login');
        throw new Error('No refresh token');
      }
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      localStorage.setItem('accessToken', data.data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      console.error('[API] Token refresh failed, clearing session');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});

export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  verifyPassword: (password) => apiClient.post('/auth/verify-password', { password }),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  updatePassword: (data) => apiClient.put('/auth/password', data),
  updatePin: (data) => apiClient.put('/auth/pin', data),
};

export const documentAPI = {
  upload: (formData) => apiClient.post('/docs/upload', formData),
  // UPDATED: Now accepts params
  getAll: (params) => apiClient.get('/docs', { params }),
  getMetadata: (id) => apiClient.get(`/docs/${id}/metadata`),
  view: (id, pin) => apiClient.post(`/docs/${id}/view`, { pin }, { responseType: 'blob' }),
  download: (id, pin) => apiClient.post(`/docs/${id}/download`, { pin }, { responseType: 'blob' }),
  delete: (id) => apiClient.delete(`/docs/${id}`),
  createShare: (id, options) => apiClient.post(`/docs/${id}/share`, options),
  accessShared: (token, password, action = 'download') => publicClient.post(`/docs/shared/${token}?action=${action}`, { password }, { responseType: 'blob' }),
  getShareLogs: (params) => apiClient.get('/docs/shares/logs', { params }),
  bulkDeleteShares: (ids) => apiClient.delete('/docs/shares/bulk', { data: { ids } }),
  revokeShare: (id) => apiClient.post(`/docs/shares/${id}/revoke`),
  extendShare: (id, newExpiresAt) => apiClient.post(`/docs/shares/${id}/extend`, { newExpiresAt }),
};

export const adminAPI = {
  getUsers: () => apiClient.get('/admin/users'),
  getStats: () => apiClient.get('/admin/stats'),
  lockUser: (userId) => apiClient.post(`/admin/users/${userId}/lock`),
  unlockUser: (userId) => apiClient.post(`/admin/users/${userId}/unlock`),
  resetPassword: (userId) => apiClient.post(`/admin/users/${userId}/reset-password`),
  getLogs: (params) => apiClient.get('/admin/logs', { params }),
  getAllDocuments: (params) => apiClient.get('/admin/documents', { params }),
  viewDocument: (id) => apiClient.get(`/admin/documents/${id}/view`, { responseType: 'blob' }),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),
};

export const folderAPI = {
  create: (data) => apiClient.post('/folders', data),
  getContents: (parentId) => apiClient.get('/folders/contents', { params: { parentId } }),
  rename: (id, name) => apiClient.patch(`/folders/${id}`, { name }),
  delete: (id) => apiClient.delete(`/folders/${id}`),
  move: (data) => apiClient.post('/folders/move', data),
};

export default apiClient;