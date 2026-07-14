import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  let url = 'http://localhost:5000/api';
  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if ((isIP || hostname.endsWith('.local') || !hostname.includes('.')) && !isLocalHost) {
      url = `http://${hostname}:5000/api`;
    } else if (!isLocalHost) {
      url = `${window.location.origin}/api`;
    }
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

export const API_BASE_URL = getBaseURL().replace(/\/api$/, '');



// Intercept requests to inject JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jyothi_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept responses to log out if token is invalid or expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (localStorage.getItem('jyothi_token')) {
        localStorage.removeItem('jyothi_token');
        localStorage.removeItem('jyothi_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
