import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { config } from '../config/env';

const TOKEN_KEY = 'expensify_token';

const instance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((requestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
});

instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('expensify_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const apiClient = {
  get: <T>(url: string, requestConfig?: AxiosRequestConfig): Promise<T> =>
    instance.get(url, requestConfig) as unknown as Promise<T>,
  post: <T>(url: string, data?: unknown, requestConfig?: AxiosRequestConfig): Promise<T> =>
    instance.post(url, data, requestConfig) as unknown as Promise<T>,
  patch: <T>(url: string, data?: unknown, requestConfig?: AxiosRequestConfig): Promise<T> =>
    instance.patch(url, data, requestConfig) as unknown as Promise<T>,
  put: <T>(url: string, data?: unknown, requestConfig?: AxiosRequestConfig): Promise<T> =>
    instance.put(url, data, requestConfig) as unknown as Promise<T>,
  delete: <T = void>(url: string, requestConfig?: AxiosRequestConfig): Promise<T> =>
    instance.delete(url, requestConfig) as unknown as Promise<T>,
};
