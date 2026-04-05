import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing YouTube authorization...');

  useEffect(() => {
    const completeOAuth = async () => {
      try {
        // Google redirects here with ?code=xxx
        const code = searchParams.get('code');
        if (!code) {
          setStatus('error');
          setMessage('No authorization code received from Google. Please try again.');
          return;
        }

        // Retrieve the form data saved before redirect
        const savedData = sessionStorage.getItem('yt_oauth_data');
        if (!savedData) {
          setStatus('error');
          setMessage('Session data lost. Please go back to Accounts and try linking again.');
          return;
        }

        const { nickname, niche, language } = JSON.parse(savedData);

        // Send the code + form data to the backend to exchange for credentials
        setMessage('Exchanging authorization code for credentials...');
        await api.post('/accounts/youtube/verify', {
          nickname,
          auth_code: code,
          niche,
          language
        });

        // Clean up
        sessionStorage.removeItem('yt_oauth_data');

        setStatus('success');
        setMessage('YouTube account linked successfully!');

        // Redirect to accounts page after a short delay
        setTimeout(() => {
          navigate('/accounts', { replace: true });
        }, 2000);

      } catch (err: any) {
        console.error('OAuth callback failed:', err);
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Failed to complete YouTube authorization. Please try again.');
        sessionStorage.removeItem('yt_oauth_data');
      }
    };

    completeOAuth();
  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="max-w-md w-full mx-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-10 text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Authorizing...</h2>
              <p className="text-zinc-400 text-sm">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Success!</h2>
              <p className="text-zinc-400 text-sm">{message}</p>
              <p className="text-zinc-600 text-xs mt-4">Redirecting to Accounts...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Authorization Failed</h2>
              <p className="text-zinc-400 text-sm mb-6">{message}</p>
              <button
                onClick={() => navigate('/accounts', { replace: true })}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all text-sm"
              >
                Back to Accounts
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
