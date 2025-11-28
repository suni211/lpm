import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;

// Auth API
export const authAPI = {
  register: (data: { username: string; email: string; password: string; displayName: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () =>
    api.post('/auth/logout'),
  getCurrentUser: () =>
    api.get('/auth/me')
};

// Songs API
export const songsAPI = {
  getAll: () =>
    api.get('/songs'),
  getById: (id: string) =>
    api.get(`/songs/${id}`),
  search: (term: string) =>
    api.get(`/songs/search/${term}`)
};

// Beatmaps API
export const beatmapsAPI = {
  getById: (id: string) =>
    api.get(`/beatmaps/${id}`),
  getBySongId: (songId: string) =>
    api.get(`/beatmaps/song/${songId}`)
};

// Game API
export const gameAPI = {
  submitPlay: (data: {
    beatmapId: string;
    judgments: { perfect: number; great: number; good: number; bad: number; miss: number };
    maxCombo: number;
    noteSpeed: number;
  }) =>
    api.post('/game/submit', data),
  getRecords: (beatmapId: string) =>
    api.get(`/game/records/${beatmapId}`)
};

// Rankings API
export const rankingsAPI = {
  getGlobal: (params?: { limit?: number; offset?: number }) =>
    api.get('/rankings/global', { params }),
  getBeatmap: (beatmapId: string, params?: { limit?: number }) =>
    api.get(`/rankings/beatmap/${beatmapId}`, { params }),
  getUserPosition: (userId: string) =>
    api.get(`/rankings/user/${userId}/position`)
};

// User API
export const userAPI = {
  getProfile: (userId: string) =>
    api.get(`/user/profile/${userId}`),
  getBestScores: (userId: string, params?: { limit?: number }) =>
    api.get(`/user/best-scores/${userId}`, { params }),
  getRecentPlays: (userId: string, params?: { limit?: number }) =>
    api.get(`/user/recent-plays/${userId}`, { params }),
  getSettings: () =>
    api.get('/user/settings'),
  updateSettings: (data: any) =>
    api.put('/user/settings', data)
};

// Admin API
export const adminAPI = {
  login: (data: { username: string; password: string }) =>
    api.post('/admin/login', data),
  createSong: (formData: FormData) =>
    api.post('/admin/songs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  createBeatmap: (data: any) =>
    api.post('/admin/beatmaps', data),
  updateBeatmap: (id: string, data: any) =>
    api.put(`/admin/beatmaps/${id}`, data),
  getAllSongs: () =>
    api.get('/admin/songs'),
  getAllBeatmaps: () =>
    api.get('/admin/beatmaps'),
  deleteSong: (id: string) =>
    api.delete(`/admin/songs/${id}`),
  deleteBeatmap: (id: string) =>
    api.delete(`/admin/beatmaps/${id}`),
  getStats: () =>
    api.get('/admin/stats')
};

// PvP API
export const pvpAPI = {
  joinQueue: () =>
    api.post('/pvp/queue/join'),
  leaveQueue: () =>
    api.post('/pvp/queue/leave'),
  getMatch: (matchId: string) =>
    api.get(`/pvp/match/${matchId}`),
  banSong: (matchId: string, songPoolId: string) =>
    api.post(`/pvp/match/${matchId}/ban`, { songPoolId }),
  getLadderRankings: (params?: { limit?: number; offset?: number }) =>
    api.get('/pvp/ladder/rankings', { params }),
  getMyRating: () =>
    api.get('/pvp/ladder/my-rating')
};
