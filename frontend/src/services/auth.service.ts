import api from './api';

export const authService = {
  register: (data: { email: string; username: string; displayName: string; password: string }) =>
    api.post('/auth/register', data),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};
