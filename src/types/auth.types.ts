export type UserRole = 'learner' | 'admin';

export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface UserProfile {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  status?: UserStatus;
  createdAt?: string;
}
