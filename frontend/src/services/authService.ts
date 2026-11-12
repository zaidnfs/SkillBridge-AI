import api, { clearStoredTokens, getStoredRefreshToken, setStoredTokens } from './api';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login/', payload);
    const data = response.data;
    const access = data.access || data.tokens?.access;
    const refresh = data.refresh || data.tokens?.refresh;
    if (access) {
      setStoredTokens(access, refresh);
    }
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register/', payload);
    const data = response.data;
    const access = data.access || data.tokens?.access;
    const refresh = data.refresh || data.tokens?.refresh;
    if (access) {
      setStoredTokens(access, refresh);
    }
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me/');
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout/', { refresh: refreshToken });
      }
    } finally {
      clearStoredTokens();
    }
  },
};
