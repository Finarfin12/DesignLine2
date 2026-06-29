import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('df_user') || 'null'); } catch { return null; }
  })(),
  token: localStorage.getItem('df_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('df_token', data.token);
      localStorage.setItem('df_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password });
      localStorage.setItem('df_token', data.token);
      localStorage.setItem('df_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('df_token');
    localStorage.removeItem('df_user');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      localStorage.setItem('df_user', JSON.stringify(data));
      set({ user: data });
    } catch {
      set({ user: null, token: null });
      localStorage.removeItem('df_token');
      localStorage.removeItem('df_user');
    }
  },
}));
