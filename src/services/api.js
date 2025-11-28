import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://secure-document-vault.onrender.com/api');

const apiClient = axios.create({ baseURL: API_BASE_URL });

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
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
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
};

export const adminAPI = {
  getUsers: () => apiClient.get('/admin/users'),
  getStats: () => apiClient.get('/admin/stats'),
  lockUser: (userId) => apiClient.post(`/admin/users/${userId}/lock`),
  unlockUser: (userId) => apiClient.post(`/admin/users/${userId}/unlock`),
  resetPassword: (userId) => apiClient.post(`/admin/users/${userId}/reset-password`),
  getLogs: (params) => apiClient.get('/admin/logs', { params }),
  getAllDocuments: (params) => apiClient.get('/admin/documents', { params }),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),
};

export default apiClient;