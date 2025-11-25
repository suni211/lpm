import axios from 'axios';

// .env의 VITE_API_URL만 사용 (없으면 상대 경로)
const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 에러는 조용히 무시 (AuthContext에서 처리)
    return Promise.reject(error);
  }
);

export default api;
