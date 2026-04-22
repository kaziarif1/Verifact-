import api from './api';

export const claimsService = {
  getFeed: (params?: Record<string, string>) =>
    api.get('/claims', { params }),

  getById: (id: string) => api.get(`/claims/${id}`),

  create: (formData: FormData) =>
    api.post('/claims', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  delete: (id: string) => api.delete(`/claims/${id}`),

  vote: (id: string, direction: 'up'|'down') =>
    api.post(`/claims/${id}/vote`, { direction }),

  removeVote: (id: string) => api.delete(`/claims/${id}/vote`),

  search: (params: Record<string, string>) =>
    api.get('/claims/search', { params }),

  getTrendingFacts: () => api.get('/claims/trending/facts'),

  getTrendingRumors: () => api.get('/claims/trending/rumors'),
};
