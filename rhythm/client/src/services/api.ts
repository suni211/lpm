import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

export const auth = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile')
};

export const songs = {
  getAll: (params?: any) => api.get('/songs', { params }),
  getOne: (id: number) => api.get(`/songs/${id}`),
  create: (formData: FormData) => api.post('/songs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id: number, data: any) => api.put(`/songs/${id}`, data),
  delete: (id: number) => api.delete(`/songs/${id}`)
};

export const beatmaps = {
  getOne: (id: number) => api.get(`/beatmaps/${id}`),
  getBySong: (songId: number) => api.get(`/beatmaps/song/${songId}`),
  create: (data: any) => api.post('/beatmaps', data),
  update: (id: number, data: any) => api.put(`/beatmaps/${id}`, data),
  delete: (id: number) => api.delete(`/beatmaps/${id}`)
};

export const scores = {
  submit: (data: any) => api.post('/scores', data),
  getLeaderboard: (params?: any) => api.get('/scores/leaderboard', { params }),
  getPersonalBest: (beatmapId: number) => api.get(`/scores/personal-best/${beatmapId}`),
  getRecent: (params?: any) => api.get('/scores/recent', { params }),
  getRanking: (params?: any) => api.get('/scores/ranking', { params })
};

export const matches = {
  getOne: (id: number) => api.get(`/matches/${id}`),
  addBan: (id: number, beatmapId: number) => api.post(`/matches/${id}/ban`, { beatmap_id: beatmapId }),
  submitResult: (id: number, roundNumber: number, data: any) =>
    api.post(`/matches/${id}/round/${roundNumber}/result`, data)
};

export default api;
