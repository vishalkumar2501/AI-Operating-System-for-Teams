import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh cookie automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  // Import lazily to avoid circular deps
  const token = localStorage.getItem('teamos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// 401 interceptor: try refresh, else clear auth and redirect
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await apiClient.post<{
          data: { accessToken: string };
        }>('/auth/refresh');
        const newToken = res.data.data.accessToken;
        localStorage.setItem('teamos_token', newToken);
        import('./socket').then(({ connectSocket }) => {
          connectSocket(newToken);
        });
        processQueue(null, newToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('teamos_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Unwrap standard API response shape: { success, data, ... }
export function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export const api = apiClient;
export default apiClient;
