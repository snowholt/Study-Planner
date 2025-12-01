import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: number;
  email: string;
  username: string;
  has_api_key: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ token: access_token, user, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Login failed' 
      });
      throw error;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', { email, username, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ token: access_token, user, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(response.data));
      set({ user: response.data });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null });
    }
  },

  clearError: () => set({ error: null }),
}));
