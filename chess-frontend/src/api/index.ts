import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 & auto-refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken, user } = response.data;
          useAuthStore.getState().setAuth(accessToken, newRefreshToken, user);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

// User APIs
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { username?: string; avatarUrl?: string }) =>
    api.put('/users/me', data),
  getStats: () => api.get('/users/me/stats'),
};

// Game APIs
export const gameAPI = {
  saveGame: (data: {
    playerColor: string;
    aiLevel: number;
    result: string;
    pgn?: string;
    finalFen?: string;
    totalMoves?: number;
    durationSeconds?: number;
    timeControl?: number;
  }) => api.post('/games', data),
  getGames: (page = 0, size = 10) =>
    api.get(`/games?page=${page}&size=${size}`),
  getGame: (id: number) => api.get(`/games/${id}`),
};
