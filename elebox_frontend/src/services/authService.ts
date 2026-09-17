import { apiClient, isMockMode } from '@/api/client';
import { MOCK_PASSWORD, MOCK_USERS } from '@/mocks/data';
import { delay } from '@/utils/helpers';
import { mapBackendUser } from '@/utils/authMapper';
import { tokenStorage } from '@/utils/storage';
import type { AuthUser, LoginRequest, LoginResponse } from '@/types';

export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    if (isMockMode()) {
      await delay(600);
      const user = MOCK_USERS.find((u) => u.email === payload.email);
      if (!user || payload.password !== MOCK_PASSWORD) {
        throw { message: 'Invalid email or password', status: 401 };
      }
      const response: LoginResponse = {
        access_token: `mock-jwt-${user.id}`,
        refresh_token: `mock-refresh-${user.id}`,
        token_type: 'Bearer',
        user,
      };
      tokenStorage.setAccessToken(response.access_token, payload.rememberMe);
      if (response.refresh_token) {
        tokenStorage.setRefreshToken(response.refresh_token, payload.rememberMe);
      }
      tokenStorage.setRememberMe(!!payload.rememberMe);
      tokenStorage.setUser(user, payload.rememberMe);
      return response;
    }

    const { data } = await apiClient.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      {
        email: payload.email,
        password: payload.password,
      },
    );

    tokenStorage.setAccessToken(data.access_token, payload.rememberMe);
    tokenStorage.setRememberMe(!!payload.rememberMe);

    const user = await authService.getMe();
    tokenStorage.setUser(user, payload.rememberMe);

    return {
      access_token: data.access_token,
      token_type: data.token_type,
      user,
    };
  },

  getMe: async (): Promise<AuthUser> => {
    if (isMockMode()) {
      await delay(300);
      const stored = tokenStorage.getUser<AuthUser>();
      if (stored) return stored;
      throw { message: 'Unauthorized', status: 401 };
    }

    const { data } = await apiClient.get('/auth/me');
    return mapBackendUser(data);
  },

  logout: (): void => {
    tokenStorage.clearAll();
  },
};
