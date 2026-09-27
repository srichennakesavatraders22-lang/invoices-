import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-logout on 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '/login';
    }
    const message =
      error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

// ─── AUTH ───────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// ─── DASHBOARD ──────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getAnalytics: (params) => api.get('/dashboard/analytics', { params }),
  getAlerts: () => api.get('/dashboard/alerts'),
};

// ─── PRODUCTS ───────────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  uploadImage: (id, formData) =>
    api.post(`/products/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getExportUrl: () => `${import.meta.env.VITE_API_URL || ''}/api/products/export/excel`,
  getTemplateUrl: () => `${import.meta.env.VITE_API_URL || ''}/api/products/import/template`,
  bulkImport: (formData) =>
    api.post('/products/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── CUSTOMERS ──────────────────────────────────────────────────────────────────
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// ─── INVOICES ───────────────────────────────────────────────────────────────────
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  updateStatus: (id, status, paymentMethod) =>
    api.patch(`/invoices/${id}/status`, { status, paymentMethod }),
  getPDFUrl: (id) => `${import.meta.env.VITE_API_URL || ''}/api/invoices/${id}/pdf`,
  getExportUrl: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return `${import.meta.env.VITE_API_URL || ''}/api/invoices/export/excel${q ? '?' + q : ''}`;
  },
};

// ─── EXPENSES ───────────────────────────────────────────────────────────────────
export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getToday: () => api.get('/expenses/today'),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories'),
  createCategory: (data) => api.post('/expenses/categories', data),
  deleteCategory: (id) => api.delete(`/expenses/categories/${id}`),
};

// ─── SETTINGS ───────────────────────────────────────────────────────────────────
export const settingsAPI = {
  getCompany: () => api.get(`/settings/company?_t=${Date.now()}`),
  updateCompany: (data) => api.put('/settings/company', data),
  uploadImage: (formData) =>
    api.post('/settings/company/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── SSE Notifications ──────────────────────────────────────────────────────────
export const createNotificationStream = (onMessage) => {
  const url = `${import.meta.env.VITE_API_URL || ''}/api/notifications/stream`;
  const evtSource = new EventSource(url);

  evtSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage(data);
    } catch {}
  };

  evtSource.onerror = () => {
    // Reconnect after 5s on error
    evtSource.close();
    setTimeout(() => createNotificationStream(onMessage), 5000);
  };

  return evtSource;
};

export default api;
