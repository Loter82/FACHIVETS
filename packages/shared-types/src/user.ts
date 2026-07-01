export type UserRole = 'PLATFORM_ADMIN' | 'OWNER' | 'ADMIN' | 'MANAGER' | 'MARKETER' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

export interface UserDto {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
