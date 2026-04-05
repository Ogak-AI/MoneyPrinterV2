import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Youtube, Twitter, Plus, Trash2, ShieldCheck, Globe, UserCircle, X } from 'lucide-react';

interface Account {
  id: string;
  nickname: string;
  niche?: string;
  topic?: string;
  language?: string;
}

const AccountsPage = () => {
  const [youtubeAccounts, setYoutubeAccounts] = useState<Account[]>([]);
  const [twitterAccounts, setTwitterAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'youtube' | 'twitter'>('youtube');
  const [submitting, setSubmitting] = useState(false);
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [authUrl, setAuthUrl] = useState('');
  
  // Form Data
  const [formData, setFormData] = useState({
    nickname: '',
    niche: '',
    language: 'English',
    topic: '',
    auth_code: '',
    oauth_token: '',
    oauth_token_secret: ''
  });

  const fetchAccounts = async () => {
    try {
      const [yt, tw] = await Promise.all([
        api.get('/accounts/youtube'),
        api.get('/accounts/twitter')
      ]);
      setYoutubeAccounts(yt.data);
      setTwitterAccounts(tw.data);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (provider: string, id: string) => {
    if (!confirm('Are you sure you want to remove this account?')) return;
    try {
      await api.delete(`/accounts/${provider}/${id}`);
      fetchAccounts();
    } catch (err) {
      alert('Failed to delete account');
    }
  };

  const resetForm = () => {
    setFormData({
      nickname: '',
      niche: '',
      language: 'English',
      topic: '',
      auth_code: '',
      oauth_token: '',
      oauth_token_secret: ''
    });
    setAuthStep(1);
    setAuthUrl('');
  };

  const handleTwitterSubmit = async () => {
    if (authStep === 1) {
      const res = await api.post('/accounts/twitter/init');
      setAuthUrl(res.data.auth_url);
      setFormData({...formData, oauth_token: res.data.oauth_token, oauth_token_secret: res.data.oauth_token_secret});
      setAuthStep(2);
      return false;
    } else {
      await api.post('/accounts/twitter/verify', {
        nickname: formData.nickname,
        topic: formData.topic,
        pin: formData.auth_code,
        oauth_token: formData.oauth_token,
        oauth_token_secret: formData.oauth_token_secret
      });
      return true;
    }
  };

  const handleYoutubeSubmit = async () => {
    // Step 1: Get the Google OAuth URL from the backend
    const res = await api.post('/accounts/youtube/init');
    
    // Step 2: Save form data so the callback page can complete the flow
    sessionStorage.setItem('yt_oauth_data', JSON.stringify({
      nickname: formData.nickname,
      niche: formData.niche,
      language: formData.language,
      code_verifier: res.data.code_verifier
    }));
    
    // Step 3: Redirect user to Google OAuth (they authorize, Google redirects back automatically)
    window.location.href = res.data.auth_url;
    return false; // don't close modal — we're navigating away
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let shouldClose = true;
      if (activeTab === 'youtube') {
        shouldClose = await handleYoutubeSubmit();
      } else {
        await handleTwitterSubmit();
      }
      
      if (shouldClose) {
        resetForm();
        setIsModalOpen(false);
        fetchAccounts();
      }
    } catch (err: any) {
      console.error('Failed to create account', err);
      alert(err.response?.data?.detail || 'Failed to link account. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2 text-emerald-500">
            <UserCircle className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Identity Management</span>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter">Connected Accounts</h2>
        </div>
        <button 
          onClick={() => {
            console.log('Opening Link Provider Modal');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-600/20 text-sm"
        >
          <Plus className="w-5 h-5" />
          LINK NEW PROVIDER
        </button>
      </header>



      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* YouTube Section */}
        <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                <Youtube className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">YouTube Channels</h3>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{youtubeAccounts.length} Connected</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {youtubeAccounts.length === 0 && !loading && (
              <div className="py-12 text-center border-2 border-dashed border-zinc-800 rounded-[2rem]">
                 <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No active channels</p>
              </div>
            )}
            {youtubeAccounts.map((acc) => (
              <div key={acc.id} className="group flex items-center justify-between p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-red-500 font-black border border-zinc-800 group-hover:border-red-500/30 transition-colors">
                    YT
                  </div>
                  <div>
                    <h4 className="font-black text-white tracking-tight">{acc.nickname}</h4>
                    <div className="flex gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> {acc.niche}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                        <Globe className="w-3 h-3 text-emerald-500" /> {acc.language}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => handleDelete('youtube', acc.id)} className="p-3 text-zinc-600 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Twitter Section */}
        <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Twitter className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Twitter Handles</h3>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{twitterAccounts.length} Connected</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {twitterAccounts.length === 0 && !loading && (
              <div className="py-12 text-center border-2 border-dashed border-zinc-800 rounded-[2rem]">
                 <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No active handles</p>
              </div>
            )}
            {twitterAccounts.map((acc) => (
              <div key={acc.id} className="group flex items-center justify-between p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-blue-500 font-black border border-zinc-800 group-hover:border-blue-500/30 transition-colors">
                    TW
                  </div>
                  <div>
                    <h4 className="font-black text-white tracking-tight">{acc.nickname}</h4>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> TOPIC: {acc.topic}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => handleDelete('twitter', acc.id)} className="p-3 text-zinc-600 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modal Overlay at very top of stack */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-10">
              <h3 className="text-3xl font-black text-white tracking-tight mb-2">Link Provider</h3>
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Connect a new terminal identity</p>
            </div>

            <div className="flex gap-4 mb-8 p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('youtube')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'youtube' 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Youtube className="w-4 h-4" /> YouTube
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('twitter')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'twitter' 
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Twitter className="w-4 h-4" /> Twitter
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-6">
              {authStep === 2 ? (
                <div className="space-y-6">
                  <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <h4 className="text-emerald-500 font-bold mb-2">Step 2: Authorize Application</h4>
                    <p className="text-sm text-zinc-400 mb-4">
                      {activeTab === 'youtube' 
                        ? "Click the link below to securely authorize the MoneyPrinterV2 bot with your YouTube Account. Copy the resulting Authorization Code and paste it here." 
                        : "Click the link below to authorize the bot with your Twitter Account. Copy the resulting PIN and paste it here."}
                    </p>
                    <a 
                      href={authUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-zinc-900 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold hover:bg-zinc-800 transition-colors"
                    >
                      Open Authorization Link ↗
                    </a>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">
                      {activeTab === 'youtube' ? 'Authorization Code' : 'Authorization PIN'}
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Paste code here..."
                      value={formData.auth_code}
                      onChange={(e) => setFormData({...formData, auth_code: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-800"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">Account Nickname</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Main Channel / My Handle"
                        value={formData.nickname}
                        onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-800"
                      />
                    </div>
                  </div>

                  {activeTab === 'youtube' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">Niche Protocol (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Finance"
                            value={formData.niche}
                            onChange={(e) => setFormData({...formData, niche: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">Language</label>
                          <input
                            required
                            type="text"
                            placeholder="English"
                            value={formData.language}
                            onChange={(e) => setFormData({...formData, language: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-800"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">Topic</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. AI News"
                          value={formData.topic}
                          onChange={(e) => setFormData({...formData, topic: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-800"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                disabled={submitting}
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black tracking-tighter transition-all active:scale-[0.98] mt-4 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {submitting ? 'PROCESSING...' : 
                 activeTab === 'youtube' ? 'CONNECT WITH GOOGLE' :
                 authStep === 1 ? 'GET AUTHORIZATION LINK' :
                 'VERIFY OAUTH AND SAVE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
