import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api, { authApi } from '../api/client';
import { UserProfile } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ACCESS_TOKEN_KEY = 'weather-aggregator-access-token';
const REFRESH_TOKEN_KEY = 'weather-aggregator-refresh-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from stored tokens
  useEffect(() => {
    const init = async () => {
      const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (accessToken) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
        } catch {
          // Token expired — try refresh
          if (refreshToken) {
            try {
              const tokens = await authApi.refresh(refreshToken);
              sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
              localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
              const profile = await authApi.getMe();
              setUser(profile);
            } catch {
              sessionStorage.removeItem(ACCESS_TOKEN_KEY);
              localStorage.removeItem(REFRESH_TOKEN_KEY);
            }
          } else {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          }
        }
      } else if (refreshToken) {
        try {
          const tokens = await authApi.refresh(refreshToken);
          sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
          const profile = await authApi.getMe();
          setUser(profile);
        } catch {
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }

      setLoading(false);
    };

    init();
  }, []);

  // Set up axios interceptors
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (refreshToken) {
            try {
              const tokens = await authApi.refresh(refreshToken);
              sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
              localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
              return api(originalRequest);
            } catch {
              sessionStorage.removeItem(ACCESS_TOKEN_KEY);
              localStorage.removeItem(REFRESH_TOKEN_KEY);
              setUser(null);
            }
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, result.tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.tokens.refreshToken);
    setUser(result.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const result = await authApi.register(email, password, name);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, result.tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.tokens.refreshToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Logout failure is non-critical
    }
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: UserProfile) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
