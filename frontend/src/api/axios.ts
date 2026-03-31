import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the Supabase JWT to every request
api.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses — only treat a 401 as "session expired", everything else
// (404, 500, network errors) should NOT kick the user out.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Genuine auth failure: clear the Supabase session first,
      // then redirect. Using window.location.replace so there's no back
      // entry left on the login page.
      await supabase.auth.signOut();
      window.location.replace('/login');
    }
    // All other errors bubble up to the calling component
    return Promise.reject(error);
  }
);

export default api;
