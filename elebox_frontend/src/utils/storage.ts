const TOKEN_KEY = 'sbox_access_token';
const REFRESH_TOKEN_KEY = 'sbox_refresh_token';
const REMEMBER_KEY = 'sbox_remember_me';
const USER_KEY = 'sbox_user';

const getStorage = (remember: boolean): Storage =>
  remember ? localStorage : sessionStorage;

export const tokenStorage = {
  getAccessToken: (): string | null =>
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY),

  setAccessToken: (token: string, remember = false): void => {
    getStorage(remember).setItem(TOKEN_KEY, token);
    if (!remember) localStorage.removeItem(TOKEN_KEY);
  },

  getRefreshToken: (): string | null =>
    localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY),

  setRefreshToken: (token: string, remember = false): void => {
    getStorage(remember).setItem(REFRESH_TOKEN_KEY, token);
    if (!remember) localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  setRememberMe: (remember: boolean): void => {
    localStorage.setItem(REMEMBER_KEY, String(remember));
  },

  getRememberMe: (): boolean => localStorage.getItem(REMEMBER_KEY) === 'true',

  setUser: (user: object, remember = false): void => {
    getStorage(remember).setItem(USER_KEY, JSON.stringify(user));
  },

  getUser: <T>(): T | null => {
    const raw =
      localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  clearUser: (): void => {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  clearAll: (): void => {
    tokenStorage.clearTokens();
    tokenStorage.clearUser();
    localStorage.removeItem(REMEMBER_KEY);
  },
};
