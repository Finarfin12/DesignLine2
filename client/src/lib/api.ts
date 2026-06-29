import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('df_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

import { showAlert } from './alert';

// Auto-logout on 401 & Global Error Handling
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.response?.data?.error || error.message;

    // Allow requests to opt-out of global error alerts
    if (error.config?.headers?.['x-silent-error']) {
      return Promise.reject(error);
    }

    switch (status) {
      case 401:
        localStorage.removeItem('df_token');
        localStorage.removeItem('df_user');
        window.location.href = '/login';
        showAlert.error('Sesi Habis', 'Sesi Anda telah berakhir, silakan login kembali.');
        break;
      case 403:
        showAlert.error('Akses Ditolak', 'Anda tidak memiliki izin untuk tindakan ini.');
        break;
      case 404:
        showAlert.error('Tidak Ditemukan', 'Data atau sumber daya tidak ditemukan.');
        break;
      case 422:
      case 400:
        const errors = error.response?.data?.errors;
        if (errors && typeof errors === 'object') {
          showAlert.error('Validasi Gagal', Object.values(errors).join(', '));
        } else {
          showAlert.error('Permintaan Tidak Valid', message);
        }
        break;
      case 429:
        showAlert.error('Terlalu Banyak Permintaan', 'Tunggu beberapa saat sebelum mencoba lagi.');
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        showAlert.error('Kesalahan Server', 'Terjadi kesalahan di server. Silakan coba lagi nanti.');
        break;
      default:
        if (error.code === 'ERR_NETWORK') {
          showAlert.error('Kesalahan Jaringan', 'Periksa koneksi internet Anda.');
        } else {
          showAlert.error('Kesalahan', message || 'Terjadi kesalahan sistem.');
        }
    }

    return Promise.reject(error);
  }
);

/** Convert relative URL to absolute using the API baseURL */
export function getFileUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${api.defaults.baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default api;
