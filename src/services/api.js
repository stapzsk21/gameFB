import axios from 'axios';
import { getErrorMessage } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Важно для cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Форматируем ошибку для удобства
    if (error.response) {
      error.userMessage = getErrorMessage(error);
    } else {
      error.userMessage = getErrorMessage(error);
    }

    // Тихая обработка 401 ошибок (не авторизован - это нормально)
    if (error.response && error.response.status === 401) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export const authAPI = {
  // Получить nonce
  async getNonce(address) {
    const response = await api.post('/auth/nonce', { address });
    return response.data;
  },

  // Проверить подпись и получить токены
  async verifySignature(address, signature) {
    const response = await api.post('/auth/verify', { address, signature });
    return response.data;
  },

  // Обновить токены
  async refreshTokens() {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  // Выйти
  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Получить текущего пользователя
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const profileAPI = {
  // Получить профиль
  async getProfile() {
    const response = await api.get('/profile');
    return response.data;
  },

  // Обновить score
  async updateScore(score) {
    const response = await api.patch('/profile/progress', { score });
    return response.data;
  },

  // Увеличить score
  async incrementScore(increment) {
    const response = await api.patch('/profile/progress', { increment });
    return response.data;
  },
};

export default api;

