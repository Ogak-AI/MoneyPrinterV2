import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle, XCircle, Loader2, PlayCircle, Mail, Hash } from 'lucide-react';

const VerifyPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const initialEmail = searchParams.get('email') || '';
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      autoVerifyToken(token);
    }
  }, [token]);

  const autoVerifyToken = async (verifyToken: string) => {
    setStatus('loading');
    try {
      const response = await api.get(`/api/auth/verify?token=${verifyToken}`);
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Verification failed.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'Verification failed. The link may be invalid or expired.');
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) {
      setMessage('Email and OTP are required');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('');
    
    try {
      const response = await api.post('/api/auth/verify-otp', { email, otp });
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'OTP verification failed. Please try again.');
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setResendMessage('Please enter your email first');
      return;
    }
    setResending(true);
    setResendMessage('');
    try {
      const response = await api.post('/api/auth/resend-verification', { email });
      setResendMessage(response.data.message);
    } catch (err: any) {
      setResendMessage(err.response?.data?.detail || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 selection:bg-emerald-500/30 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden select-none">
        <div className="whitespace-nowrap animate-marquee py-4 text-[20rem] font-black text-white">
          VERIFY VERIFY VERIFY VERIFY &nbsp;
        </div>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <PlayCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">
              VERIFY<span className="text-emerald-500">PRINTER</span>
            </h1>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-8 shadow-2xl text-center">
          {status === 'loading' && (
            <div className="py-8 space-y-4">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Processing</h2>
              <p className="text-sm text-zinc-500">Connecting to secure authentication node...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold text-white">Access Granted</h2>
              <p className="text-sm text-zinc-500">{message}</p>
              <p className="text-xs text-emerald-500/80">Redirecting to terminal in 3s...</p>
              <Link to="/login" className="block mt-4 text-emerald-500 font-bold hover:underline uppercase text-xs tracking-widest">
                Login Now
              </Link>
            </div>
          )}

          {(status === 'error' || status === 'idle') && (
            <div className="py-2 space-y-6 text-left">
              {status === 'error' && (
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 p-4 text-xs font-medium text-red-400 border border-red-500/20">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <p>{message}</p>
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Identity Verification</h2>
                <p className="text-sm text-zinc-500 mt-1">Enter your 6-digit OTP code sent to your email</p>
              </div>
              
              <form onSubmit={handleOTPVerify} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1">Operator ID (Email)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-zinc-600">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3.5 pl-11 pr-4 text-zinc-200 placeholder-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                      placeholder="operator@system.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1">6-Digit Code (OTP)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-zinc-600">
                      <Hash className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3.5 pl-11 pr-4 text-zinc-200 placeholder-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-2xl tracking-[0.5em] font-mono text-center"
                      placeholder="000000"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  VERIFY CODE
                </button>
              </form>

              <div className="border-t border-zinc-800 pt-6 mt-6">
                <h3 className="text-[10px] font-bold text-white mb-2 uppercase tracking-widest">No code received?</h3>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase"
                >
                  {resending ? 'TRANSMITTING...' : 'RESEND VERIFICATION LINK'}
                </button>
                {resendMessage && (
                  <p className="text-[10px] text-zinc-500 mt-2 italic">
                    {resendMessage}
                  </p>
                )}
              </div>

              <div className="pt-2 text-center">
                <Link to="/login" className="text-xs font-medium text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-widest">
                  BACK TO <span className="text-emerald-500 font-bold ml-1">SIGN IN</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
