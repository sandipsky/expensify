import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { config } from '../config/env';
import { useAuthStore } from '../stores/authStore';
import { camelizeKeys, snakeizeKeys } from './caseConvert';

const instance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((requestConfig) => {
  const { token } = useAuthStore.getState();
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set the multipart boundary for file uploads; otherwise
  // convert the camelCase request body to the snake_case the API expects.
  if (requestConfig.data instanceof FormData) {
    delete requestConfig.headers['Content-Type'];
  } else if (requestConfig.data && typeof requestConfig.data === 'object') {
    requestConfig.data = snakeizeKeys(requestConfig.data);
  }
  return requestConfig;
});

// Unwrap the API envelope: IApiResponse<T> -> T, IPaginatedResponse<T> -> T[].
function unwrap(body: unknown): unknown {
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body) {
    const record = body as Record<string, unknown>;
    if ('success' in record || 'pagination' in record) {
      return record.data;
    }
  }
  return body;
}

instance.interceptors.response.use(
  (response: AxiosResponse) => camelizeKeys(unwrap(response.data)),
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
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
