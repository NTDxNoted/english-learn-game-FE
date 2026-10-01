const ACCESS_TOKEN_KEY = 'auth_access_token';

export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch {
      // Do nothing in case storage quota is exceeded
    }
  },

  removeAccessToken(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // Do nothing
    }
  },

  hasAccessToken(): boolean {
    return Boolean(this.getAccessToken());
  },

  notifyUnauthorized(): void {
    this.removeAccessToken();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  },
};
