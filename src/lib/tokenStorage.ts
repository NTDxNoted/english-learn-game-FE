const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

/**
 * Quản lý lưu trữ an toàn token AWS Cognito (accessToken & refreshToken)
 * theo hướng dẫn WordMotion_FE_AWS_Cognito_Flow_Guide.md:
 * - Chỉ lưu accessToken và refreshToken vào localStorage
 * - Không lưu idToken (backend từ chối idToken làm Bearer)
 */
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
      // Bỏ qua nếu dung lượng lưu trữ đầy
    }
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      // Bỏ qua
    }
  },

  setTokens(tokens: { accessToken: string; refreshToken?: string }): void {
    this.setAccessToken(tokens.accessToken);
    if (tokens.refreshToken) {
      this.setRefreshToken(tokens.refreshToken);
    }
  },

  clearTokens(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Bỏ qua
    }
  },

  removeAccessToken(): void {
    this.clearTokens();
  },

  hasAccessToken(): boolean {
    return Boolean(this.getAccessToken());
  },

  notifyUnauthorized(): void {
    this.clearTokens();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  },
};
