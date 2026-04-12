// Axios instance com interceptors — ADR-005 (Next.js App Router)
// Request: injeta Authorization header e x-filial-id
// Response: renovação automática de access token em 401 (Promise queue)

import axios from 'axios';

// Importações dinâmicas para evitar SSR issues (stores são client-only)
const getAuthStore = () => {
  if (typeof window === 'undefined') return null;
  return require('@/stores/authStore').useAuthStore.getState();
};

const getFilialStore = () => {
  if (typeof window === 'undefined') return null;
  return require('@/stores/filialStore').useFilialStore.getState();
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Enviar cookies httpOnly (refresh token)
});

// Request: injetar access token e filial ativa
api.interceptors.request.use((config) => {
  const auth = getAuthStore();
  const filial = getFilialStore();

  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  if (filial?.activeFilialId) {
    config.headers['x-filial-id'] = filial.activeFilialId;
  }

  return config;
});

// Response: refresh automático em 401 com Promise queue para requests concorrentes
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = api
          .post('/auth/refresh')
          .then((res) => res.data.accessToken)
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        const newToken = await refreshPromise;
        getAuthStore()?.setAccessToken(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        getAuthStore()?.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
