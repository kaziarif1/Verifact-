import api from './api';

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getQueue: (params?: Record<string, string>) => api.get('/admin/claims/queue', { params }),
  setVerdict: (id: string, decision: 'Fact'|'Rumor', adminNote?: string) =>
    api.patch(`/admin/claims/${id}/verdict`, { decision, adminNote }),
  getUsers: (params?: Record<string, string>) => api.get('/admin/users', { params }),
  verifyUser: (id: string) => api.patch(`/admin/users/${id}/verify`),
  banUser: (id: string) => api.patch(`/admin/users/${id}/ban`),
  getCandidates: () => api.get('/admin/claims/verification-candidates'),
  getHealth: () => api.get('/admin/system/health'),
};
