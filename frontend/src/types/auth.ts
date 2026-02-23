export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'dispatcher' | 'viewer';
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: UserProfile;
  tokens: AuthTokens;
}
