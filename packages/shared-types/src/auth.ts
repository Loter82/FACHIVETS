import type { UserDto } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserDto;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: UserDto['role'];
  iat?: number;
  exp?: number;
}
