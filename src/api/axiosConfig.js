
import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:3001', // Node.js backend
  withCredentials: true, // allow cookies for auth if needed
});

// Example: Attach token if available
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Example: Handle auth errors globally
instance.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Optionally redirect to login or show message
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;
