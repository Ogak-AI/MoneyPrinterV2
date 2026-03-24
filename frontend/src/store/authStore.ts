import { create } from 'zustand';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isInitialized: boolean;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isInitialized: false,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isInitialized: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
  initialize: () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        set({ user, token, isInitialized: true });
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },
}));
