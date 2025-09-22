// services/baseService.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

class BaseOmniService {
  protected api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/omni`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor para agregar token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor para manejar errores
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Manejar logout
          localStorage.removeItem('token');
          window.location.href = '/login';
        }

        // Mejorar mensaje de error
        const errorMessage = error.response?.data?.message ||
                           error.response?.data?.error ||
                           error.message ||
                           'An unexpected error occurred';

        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  protected handleError(error: any): never {
    console.error('API Error:', error);
    throw error;
  }
}

export default BaseOmniService;