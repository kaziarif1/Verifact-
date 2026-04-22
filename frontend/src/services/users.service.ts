import api from './api';

export const usersService = {
  getProfile:    (username: string) => api.get(`/users/${username}`),
  updateProfile: (data: Record<string, string>) => api.put('/users/me', data),
  uploadAvatar:  (file: File) => {
    const fd = new FormData(); fd.append('avatar', file);
    return api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getMyStats:  () => api.get('/users/me/stats'),
  getMyPosts:  (params?: Record<string, string>) => api.get('/users/me/posts', { params }),
  getUserPosts:(username: string, params?: Record<string, string>) => api.get(`/users/${username}/posts`, { params }),
  getMyVotes:  (params?: Record<string, string>) => api.get('/users/me/votes', { params }),
  // Follow / Unfollow
  follow:      (userId: string) => api.post(`/users/${userId}/follow`),
  unfollow:    (userId: string) => api.delete(`/users/${userId}/follow`),
  getFollowers:(username: string) => api.get(`/users/${username}/followers`),
  getFollowing:(username: string) => api.get(`/users/${username}/following`),
};

export const messagesService = {
  getConversations: () => api.get('/messages'),
  getConversation:  (userId: string, params?: Record<string,string>) => api.get(`/messages/${userId}`, { params }),
  sendMessage:      (toUserId: string, content: string) => api.post('/messages', { to: toUserId, content }),
  markRead:         (userId: string) => api.patch(`/messages/${userId}/read`),
};

export const groupsService = {
  getAll:     (params?: Record<string,string>) => api.get('/groups', { params }),
  getBySlug:  (slug: string) => api.get(`/groups/${slug}`),
  create:     (data: Record<string,string>) => api.post('/groups', data),
  join:       (groupId: string) => api.post(`/groups/${groupId}/join`),
  leave:      (groupId: string) => api.delete(`/groups/${groupId}/join`),
  getFeed:    (slug: string, params?: Record<string,string>) => api.get(`/groups/${slug}/claims`, { params }),
  getMembers: (slug: string) => api.get(`/groups/${slug}/members`),
};
