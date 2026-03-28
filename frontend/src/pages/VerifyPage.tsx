import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle, XCircle, Loader2, PlayCircle, Mail } from 'lucide-react';

const VerifyPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await api.get(`/api/auth/verify?token=${token}`);
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

    verifyEmail();
  }, [token, navigate]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
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
              <h2 className="text-xl font-bold text-white">Verifying Identity</h2>
              <p className="text-sm text-zinc-500">Connecting to the secure authentication server...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold text-white">Verification Successful</h2>
              <p className="text-sm text-zinc-500">{message}</p>
              <p className="text-xs text-emerald-500/80">Redirecting to login in 3 seconds...</p>
              <Link to="/login" className="block mt-4 text-emerald-500 font-bold hover:underline">
                GO TO LOGIN NOW
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-6 text-left">
              <div className="text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white">Verification Failed</h2>
                <p className="text-sm text-zinc-500 mt-2">{message}</p>
              </div>

              <div className="border-t border-zinc-800 pt-6 mt-6">
                <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">Need a new link?</h3>
                <p className="text-xs text-zinc-500 mb-4">Enter your email to receive a new verification link.</p>
                
                <form onSubmit={handleResend} className="space-y-4">
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
                  
                  <button
                    type="submit"
                    disabled={resending}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {resending ? 'SENDING...' : 'RESEND VERIFICATION LINK'}
                  </button>
                  
                  {resendMessage && (
                    <p className="text-[10px] text-emerald-500 font-bold text-center uppercase tracking-tighter">
                      {resendMessage}
                    </p>
                  )}
                </form>
              </div>

              <div className="pt-4 text-center">
                <Link to="/login" className="text-xs font-medium text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-widest">
                  BACK TO <span className="text-emerald-500 font-bold">SIGN IN</span>
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
