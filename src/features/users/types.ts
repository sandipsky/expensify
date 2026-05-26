import type { IStoredUser, IUser, UserRole } from '../auth/types';

export type { IStoredUser, IUser, UserRole };

export interface IUserFormCreateValues {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface IUserFormUpdateValues {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
}
