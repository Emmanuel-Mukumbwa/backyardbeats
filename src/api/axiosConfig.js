//src/api/axiosConfig.js
import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  timeout: 60000,
}); 
 
function debugLog(...args) { 
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}

instance.interceptors.request.use(
  config => {
    try {
      let token = null;

      token = sessionStorage.getItem('bb_token');

      if (!token) {
        const rawBbAuth = sessionStorage.getItem('bb_auth');
        if (rawBbAuth) {
          try {
            const parsed = JSON.parse(rawBbAuth);
            if (parsed && parsed.token) token = parsed.token;
          } catch (e) {
            token = rawBbAuth;
          }
        }
      }

      if (!token) token = sessionStorage.getItem('authToken');

      if (process.env.NODE_ENV === 'development') {
        debugLog('🔑 Token lookup:', {
          bb_token: sessionStorage.getItem('bb_token') ? 'Found' : 'Missing',
          bb_auth: sessionStorage.getItem('bb_auth') ? 'Found' : 'Missing',
          authToken: sessionStorage.getItem('authToken') ? 'Found' : 'Missing',
          finalToken: token ? `Found (${token.substring(0, 20)}...)` : 'NOT FOUND'
        });
      }

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        if (process.env.NODE_ENV === 'development') {
          debugLog('⚠️ No token found in sessionStorage - request will fail if auth is required');
        }
      }
    } catch (e) {
      console.error('Error in request interceptor:', e);
    }
    return config;
  },
  err => Promise.reject(err)
);

instance.interceptors.response.use(
  response => response,
  error => {
    if (!error.response) {
      error.isNetworkError = true;
      error.userMessage = 'Unable to reach our servers. Please check your network connection and try again.';
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status === 401) {
      debugLog('❌ Request returned 401 — clearing auth and redirecting to /login');

      try {
        sessionStorage.removeItem('bb_token');
        sessionStorage.removeItem('bb_auth');
        sessionStorage.removeItem('bb_user');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('isLoggedIn');
      } catch (e) {
        debugLog('Error clearing storage during 401 handling:', e);
      }

      try {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
      } catch (e) {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default instance;