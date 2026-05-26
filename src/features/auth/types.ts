export type UserRole = 'admin' | 'user';

export interface IUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface IStoredUser extends IUser {
  password: string;
}

export interface ILoginCredentials {
  username: string;
  password: string;
}
