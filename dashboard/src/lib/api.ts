const BASE_URL = 'http://localhost:3000';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

class ApiClient {
  private getStorageItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  private removeStorageItem(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  get accessToken(): string | null {
    return this.getStorageItem('access_token');
  }

  set accessToken(token: string | null) {
    if (token) {
      this.setStorageItem('access_token', token);
    } else {
      this.removeStorageItem('access_token');
    }
  }

  get refreshToken(): string | null {
    return this.getStorageItem('refresh_token');
  }

  set refreshToken(token: string | null) {
    if (token) {
      this.setStorageItem('refresh_token', token);
    } else {
      this.removeStorageItem('refresh_token');
    }
  }

  get user(): User | null {
    const data = this.getStorageItem('user');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  set user(u: User | null) {
    if (u) {
      this.setStorageItem('user', JSON.stringify(u));
    } else {
      this.removeStorageItem('user');
    }
  }

  clearAuth(): void {
    this.removeStorageItem('access_token');
    this.removeStorageItem('refresh_token');
    this.removeStorageItem('user');
  }

  // Core request wrapper that appends Auth headers and implements token refresh retry on 401
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${BASE_URL}${endpoint}`;
    
    // Prepare headers
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    
    const requestOptions = {
      ...options,
      headers
    };

    let response = await fetch(url, requestOptions);

    // If unauthorized, attempt token rotation
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        // Retry original request with new token
        headers.set('Authorization', `Bearer ${this.accessToken}`);
        response = await fetch(url, requestOptions);
      }
    }

    return response;
  }

  private async refreshTokens(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (!res.ok) {
        this.clearAuth();
        return false;
      }

      const data = await res.json();
      if (data.accessToken && data.refreshToken) {
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        return true;
      }
      
      this.clearAuth();
      return false;
    } catch (err) {
      console.error('Refresh token error:', err);
      this.clearAuth();
      return false;
    }
  }

  async register(name: string, email: string, password: string): Promise<any> {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.user = data.user;
    
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      this.clearAuth();
    }
  }

  async rotateTokensManually(): Promise<boolean> {
    return this.refreshTokens();
  }

  async getMe(): Promise<User> {
    const res = await this.request('/users/me');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch user profile');
    }
    return data.user;
  }

  async getAdminUsers(): Promise<{ users: User[]; total: number }> {
    const res = await this.request('/users/admin/users');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch admin users');
    }
    return data;
  }
}

export const api = new ApiClient();
