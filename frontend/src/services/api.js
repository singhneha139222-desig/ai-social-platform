import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response.data?.code;
      if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
};

// User APIs
export const userAPI = {
  getProfile: (username) => api.get(`/users/${username}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.post('/users/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFollowers: (username, page = 1) => api.get(`/users/${username}/followers?page=${page}`),
  getFollowing: (username, page = 1) => api.get(`/users/${username}/following?page=${page}`),
  followUser: (id) => api.post(`/users/${id}/follow`),
  unfollowUser: (id) => api.delete(`/users/${id}/follow`),
  searchUsers: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  checkUsername: (username) => api.get(`/users/check-username?username=${encodeURIComponent(username)}`),
  getFollowRequests: () => api.get('/users/follow-requests'),
  acceptFollowRequest: (id) => api.post(`/users/${id}/accept-follow`),
  rejectFollowRequest: (id) => api.post(`/users/${id}/reject-follow`),
};

// Post APIs
export const postAPI = {
  create: (data) => api.post('/posts', data),
  getPost: (id) => api.get(`/posts/${id}`),
  deletePost: (id) => api.delete(`/posts/${id}`),
  getUserPosts: (userId, page = 1) => api.get(`/posts/user/${userId}?page=${page}`),
  likePost: (id) => api.post(`/posts/${id}/like`),
  unlikePost: (id) => api.delete(`/posts/${id}/like`),
  getComments: (postId, page = 1) => api.get(`/posts/${postId}/comments?page=${page}`),
  createComment: (postId, data) => api.post(`/posts/${postId}/comments`, data),
};

// Comment APIs
export const commentAPI = {
  deleteComment: (id) => api.delete(`/comments/${id}`),
};

// Feed APIs
export const feedAPI = {
  getFeed: (page = 1) => api.get(`/feed?page=${page}`),
  getExplore: (page = 1) => api.get(`/explore?page=${page}`),
  getRecommendations: (page = 1) => api.get(`/recommendations?page=${page}`),
};

// Notification APIs
export const notificationAPI = {
  getNotifications: (page = 1) => api.get(`/notifications?page=${page}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getFlaggedPosts: (page = 1, type = 'post') => api.get(`/admin/moderation/flagged?page=${page}&type=${type}`),
  getModerationDetail: (id, type = 'post') => api.get(`/admin/moderation/${id}?type=${type}`),
  approveContent: (id, data) => api.post(`/admin/moderation/${id}/approve`, data),
  rejectContent: (id, data) => api.post(`/admin/moderation/${id}/reject`, data),
  triggerBotScan: (userId, force = false) => api.post(`/admin/bot-detection/${userId}/scan?force=${force}`),
  getLatestBotScan: (userId) => api.get(`/admin/bot-detection/${userId}`),
};

// Message APIs
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  createConversation: (userId) => api.post('/messages/conversations', { userId }),
  getMessages: (conversationId, page = 1) => api.get(`/messages/conversations/${conversationId}?page=${page}`),
  sendMessage: (conversationId, text) => api.post(`/messages/conversations/${conversationId}/messages`, { text }),
  markAsRead: (conversationId) => api.patch(`/messages/conversations/${conversationId}/read`),
  acceptRequest: (conversationId) => api.patch(`/messages/conversations/${conversationId}/accept`),
  deleteConversation: (conversationId) => api.delete(`/messages/conversations/${conversationId}`),
};

export default api;
