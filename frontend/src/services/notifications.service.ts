import api from './api';

export const notificationsService = {
  getAll: (params?: Record<string, string>) => api.get('/notifications', { params }),
  markAllRead: () => api.patch('/notifications/read-all'),
  markOneRead: (id: string) => api.patch(`/notifications/${id}/read`),
};
