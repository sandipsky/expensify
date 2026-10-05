import axios, { type AxiosError } from 'axios'
import { config } from '@/config/env'
import { useAuthStore } from '@/features/auth/auth.store'

export const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach the bearer token (when logged in) to every call.
apiClient.interceptors.request.use((requestConfig) => {
  const token = useAuthStore.getState().token
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`
  }
  return requestConfig
})

// Response interceptor: the mock server answers 403 for a missing/invalid
// token, so log out and send the user back to /login.
// Keep this status in sync with `requireAuth` in mock-server/server.js.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 403) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)
