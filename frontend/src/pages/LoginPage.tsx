import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, AlertCircle, PlayCircle } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { access_token } = response.data;
      setAuth({ id: 'temp-id', email }, access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden select-none">
        <div className="whitespace-nowrap animate-marquee py-4 text-[20rem] font-black text-white">
          MONEYPRINTER MONEYPRINTER MONEYPRINTER &nbsp;
        </div>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <PlayCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">
              MONEY<span className="text-emerald-500">PRINTER</span>
            </h1>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white">Welcome Back</h2>
            <p className="text-sm text-zinc-500">Enter your credentials to access the terminal</p>
          </div>
          
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 p-4 text-xs font-medium text-red-400 border border-red-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1">Identity (Email)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-zinc-600">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3.5 pl-11 pr-4 text-zinc-200 placeholder-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="operator@system.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1">Access Key (Password)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-zinc-600">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3.5 pl-11 pr-4 text-zinc-200 placeholder-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold tracking-tight transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/10 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'INITIALIZE SESSION'}
            </button>
            
            <div className="pt-4 text-center">
              <Link to="/register" className="text-xs font-medium text-zinc-500 hover:text-emerald-400 transition-colors">
                NEW OPERATOR? <span className="text-emerald-500 font-bold ml-1">REGISTER HERE</span>
              </Link>
            </div>
          </form>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
          SECURE ENCRYPTED ACCESS • v2.0.4
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
