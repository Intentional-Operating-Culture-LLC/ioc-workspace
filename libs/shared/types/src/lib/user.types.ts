export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  users: User[];
  createdAt: Date;
  updatedAt: Date;
}
