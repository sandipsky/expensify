import axios from 'axios';
import { apiClient } from '../../../lib/apiClient';
import type { ILoginCredentials, IUser } from '../types';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid username or password');
    this.name = 'InvalidCredentialsError';
  }
}

interface ILoginResponse {
  token: string;
  refresh: string;
  user: IUser;
}

export interface IAuthResult {
  token: string;
  user: IUser;
}

export async function login(credentials: ILoginCredentials): Promise<IAuthResult> {
  try {
    const result = await apiClient.post<ILoginResponse>('/auth/login', {
      username: credentials.username.trim().toLowerCase(),
      password: credentials.password,
    });
    return { token: result.token, user: result.user };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new InvalidCredentialsError();
    }
    throw error;
  }
}
