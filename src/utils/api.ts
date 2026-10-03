import axios, { AxiosError } from 'axios';
import {
  ApiResponse,
  CreateProductInput,
  CreateTransactionInput,
  Product,
  Transaction,
  UpdateProductInput,
} from '../types';

// Base API URL default to http://localhost:5000 or environment variable
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface LoginPayload {
  email: string;
  password: string;
  tenantSlug: string;
}

export interface UserProfile {
  id?: string;
  name?: string;
  fullName?: string;
  email: string;
  role?: string;
  userRole?: string;
  tenantId?: string;
}

export interface LoginResponseData {
  token?: string;
  accessToken?: string;
  tenantId?: string;
  userRole?: string;
  user?: UserProfile;
  tenant?: {
    id: string;
    name?: string;
    slug?: string;
  };
  message?: string;
  data?: {
    token?: string;
    accessToken?: string;
    tenantId?: string;
    userRole?: string;
    role?: string;
    user?: UserProfile;
    tenant?: {
      id: string;
      name?: string;
      slug?: string;
    };
  };
}

export interface RegisterPayload {
  storeName: string;
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResponseData {
  status?: string;
  message?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  data?: {
    tenant?: {
      id: string;
      name: string;
      slug: string;
    };
    user?: UserProfile;
  };
}

// 1. Create Axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to automatically attach JWT token and tenantId
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    const tenantSlug = localStorage.getItem('tenantSlug');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified response handling and 401 handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    // If unauthorized and not on the login/register endpoint, auto-logout
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        logoutTenant();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Helper to parse backend error message
 */
export const extractErrorMessage = (error: unknown, fallbackMessage = 'Terjadi kesalahan pada server'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      if (typeof data === 'string') return data;
      if (typeof data.message === 'string') return data.message;
      if (typeof data.error === 'string') return data.error;
      if (Array.isArray((data as { errors?: { message: string }[] }).errors)) {
        return (data as { errors: { message: string }[] }).errors.map((e) => e.message).join(', ');
      }
    }
    if (error.code === 'ERR_NETWORK') {
      return `Tidak dapat terhubung ke backend (${API_BASE_URL}). Pastikan server backend sudah aktif.`;
    }
    if (error.response?.status === 401) {
      return 'Kredensial tidak valid atau sesi Anda telah berakhir.';
    }
    if (error.response?.status === 403) {
      return 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.';
    }
    if (error.response?.status === 404) {
      return 'Data atau endpoint yang dituju tidak ditemukan.';
    }
    return error.message || fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};

/**
 * Login function
 */
export const loginTenant = async (
  email: string,
  password: string,
  tenantSlug: string
): Promise<LoginResponseData> => {
  const payload: LoginPayload = {
    email: email.trim(),
    password,
    tenantSlug: tenantSlug.trim().toLowerCase(),
  };

  try {
    const response = await api.post<LoginResponseData>('/auth/login', payload, {
      headers: {
        'X-Tenant-Slug': payload.tenantSlug,
      },
    });

    const resData = response.data;
    const nestedData = resData.data || {};

    const token =
      resData.token ||
      resData.accessToken ||
      nestedData.token ||
      nestedData.accessToken;

    const tenantId =
      resData.tenantId ||
      nestedData.tenantId ||
      resData.tenant?.id ||
      nestedData.tenant?.id ||
      resData.user?.tenantId ||
      nestedData.user?.tenantId ||
      payload.tenantSlug;

    const userRole =
      resData.userRole ||
      nestedData.userRole ||
      resData.user?.role ||
      nestedData.role ||
      nestedData.user?.role ||
      'Staff';

    const userName =
      resData.user?.name ||
      resData.user?.fullName ||
      nestedData.user?.name ||
      nestedData.user?.fullName ||
      payload.email.split('@')[0];

    if (token) {
      localStorage.setItem('token', token);
    }
    if (tenantId) {
      localStorage.setItem('tenantId', String(tenantId));
    }
    if (userRole) {
      localStorage.setItem('userRole', String(userRole));
    }

    localStorage.setItem('tenantSlug', payload.tenantSlug);
    localStorage.setItem('userEmail', payload.email);
    localStorage.setItem('userName', userName);

    return resData;
  } catch (error) {
    const friendlyMessage = extractErrorMessage(
      error,
      'Gagal melakukan login. Periksa koneksi dan data akun Anda.'
    );
    throw new Error(friendlyMessage);
  }
};

/**
 * Register function
 */
export const registerOwner = async (data: RegisterPayload): Promise<RegisterResponseData> => {
  try {
    const response = await api.post<RegisterResponseData>('/auth/register', {
      storeName: data.storeName.trim(),
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });
    return response.data;
  } catch (error) {
    const friendlyMessage = extractErrorMessage(
      error,
      'Gagal mendaftarkan toko baru. Silakan periksa kembali data Anda.'
    );
    throw new Error(friendlyMessage);
  }
};

/**
 * Logout function
 */
export const logoutTenant = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('tenantId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('tenantSlug');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
};

/**
 * Auth state helpers
 */
export const getAuthToken = (): string | null => localStorage.getItem('token');
export const getTenantId = (): string | null => localStorage.getItem('tenantId');
export const getUserRole = (): string | null => localStorage.getItem('userRole');
export const getTenantSlug = (): string | null => localStorage.getItem('tenantSlug');
export const getUserEmail = (): string | null => localStorage.getItem('userEmail');
export const getUserName = (): string | null => localStorage.getItem('userName');
export const isAuthenticated = (): boolean => Boolean(localStorage.getItem('token'));

// ==========================================
// Product API Services
// ==========================================

export interface ProductQueryParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'sellingPrice' | 'basePrice';
  sortOrder?: 'asc' | 'desc';
}

export const fetchProducts = async (params?: ProductQueryParams): Promise<ApiResponse<Product[]>> => {
  const response = await api.get<ApiResponse<Product[]>>('/products', { params });
  return response.data;
};

export const fetchProductById = async (id: string): Promise<ApiResponse<Product>> => {
  const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
  return response.data;
};

export const createProduct = async (data: CreateProductInput): Promise<ApiResponse<Product>> => {
  const response = await api.post<ApiResponse<Product>>('/products', data);
  return response.data;
};

export const updateProduct = async (id: string, data: UpdateProductInput): Promise<ApiResponse<Product>> => {
  const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
  return response.data;
};

// ==========================================
// Transaction (POS) API Services
// ==========================================

export interface TransactionQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  cashierId?: string;
}

export const createTransaction = async (data: CreateTransactionInput): Promise<ApiResponse<Transaction>> => {
  const response = await api.post<ApiResponse<Transaction>>('/transactions', data);
  return response.data;
};

export const fetchTransactions = async (params?: TransactionQueryParams): Promise<ApiResponse<Transaction[]>> => {
  const response = await api.get<ApiResponse<Transaction[]>>('/transactions', { params });
  return response.data;
};

export const fetchTransactionById = async (id: string): Promise<ApiResponse<Transaction>> => {
  const response = await api.get<ApiResponse<Transaction>>(`/transactions/${id}`);
  return response.data;
};

// ==========================================
// Formatters & Utilities
// ==========================================

export const formatRupiah = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return 'Rp 0';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatNumber = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '0';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
};