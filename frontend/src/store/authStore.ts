import { create } from 'zustand';
import { supabase } from '../api/supabase';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  session: any | null;
  setAuth: (user: User, session: any) => void;
  logout: () => Promise<void>;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  cleanup: () => void;
}

// Keep a reference to the unsubscribe function so we can clean it up
let _authUnsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isInitialized: false,
  setAuth: (user, session) => {
    set({ user, session, isInitialized: true });
  },
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
  cleanup: () => {
    if (_authUnsubscribe) {
      _authUnsubscribe();
      _authUnsubscribe = null;
    }
  },
  initialize: async () => {
    // Avoid registering duplicate listeners
    if (_authUnsubscribe) {
      _authUnsubscribe();
      _authUnsubscribe = null;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      set({
        user: { id: session.user.id, email: session.user.email || '' },
        session,
        isInitialized: true
      });
    } else {
      set({ isInitialized: true });
    }

    // Listen for auth changes and store the cleanup handle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({
          user: { id: session.user.id, email: session.user.email || '' },
          session
        });
      } else {
        set({ user: null, session: null });
      }
    });
    _authUnsubscribe = () => subscription.unsubscribe();
  },
}));

