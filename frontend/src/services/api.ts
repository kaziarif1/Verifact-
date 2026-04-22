import axios from 'axios';
import { demoApi, isDemoMode } from './demoApi';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const createAxiosApi = () => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });

  let isRefreshing = false;
  let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

  const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((pending) => (error ? pending.reject(error) : pending.resolve(token)));
    failedQueue = [];
  };

  api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem('accessToken');
    if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });

  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config;
      if (err.response?.status === 401 && !original._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          });
        }
        original._retry = true;
        isRefreshing = true;
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
          const newToken = data.data.accessToken;
          localStorage.setItem('accessToken', newToken);
          processQueue(null, newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
      return Promise.reject(err);
    }
  );

  return api;
};

const api = isDemoMode() ? demoApi : createAxiosApi();

export default api;
