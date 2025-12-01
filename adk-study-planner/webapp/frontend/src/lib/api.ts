import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors - only redirect if not on auth pages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear and redirect if we're not already on an auth page
      // and the request was supposed to be authenticated
      const isAuthPage = window.location.pathname === '/login' || 
                         window.location.pathname === '/register';
      const hadToken = error.config?.headers?.Authorization;
      
      if (!isAuthPage && hadToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
