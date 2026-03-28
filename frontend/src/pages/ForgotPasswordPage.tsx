import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Mail, AlertCircle, CheckCircle, PlayCircle, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/api/auth/reset-password/request', { email });
      setSuccess(true);
      setMessage(response.data.message);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 selection:bg-emerald-500/30 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden select-none">
        <div className="whitespace-nowrap animate-marquee py-4 text-[20rem] font-black text-white">
          RECOVERY RECOVERY RECOVERY RECOVERY &nbsp;
        </div>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">
              RECOVER<span className="text-emerald-500">KEY</span>
            </h1>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-8 text-left">
            <Link to="/login" className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-emerald-500 transition-colors mb-4 uppercase tracking-widest">
              <ArrowLeft className="w-3 h-3" />
              Back to Sign In
            </Link>
            <h2 className="text-xl font-bold text-white">Forgot Access Key?</h2>
            <p className="text-sm text-zinc-500 mt-1">Enter your email and we'll send you recovery instructions</p>
          </div>
          
          {success ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">Request Transmitted</h2>
              <p className="text-sm text-zinc-400">{message}</p>
              <div className="pt-4">
                <Link to="/login" className="text-xs font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest">
                  Return to Terminal
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 p-4 text-xs font-medium text-red-400 border border-red-500/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              <form className="space-y-5" onSubmit={handleRequest}>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1 text-left">Identity (Email)</label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold tracking-tight transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/10 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : 'SEND RECOVERY LINK'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
