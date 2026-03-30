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
  
  // Form Data
  const [formData, setFormData] = useState({
    nickname: '',
    firefox_profile: '',
    niche: '',
    language: 'English',
    topic: ''
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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = activeTab === 'youtube' ? '/accounts/youtube' : '/accounts/twitter';
      const payload = activeTab === 'youtube' ? {
        nickname: formData.nickname,
        firefox_profile: formData.firefox_profile,
        niche: formData.niche,
        language: formData.language
      } : {
        nickname: formData.nickname,
        firefox_profile: formData.firefox_profile,
        topic: formData.topic
      };

      await api.post(endpoint, payload);
      
      // Reset and close
      setFormData({
        nickname: '',
        firefox_profile: '',
        niche: '',
        language: 'English',
        topic: ''
      });
      setIsModalOpen(false);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to create account', err);
      alert('Failed to link account. Please check your inputs.');
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
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-600/20 text-sm"
        >
          <Plus className="w-5 h-5" />
          LINK NEW PROVIDER
        </button>
      </header>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative shadow-2xl animate-in fade-in zoom-in duration-200">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">Nickname</label>
                  <input
                    required
                    type="text"
                    placeholder="Main Channel"
                    value={formData.nickname}
                    onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">Firefox Profile</label>
                  <input
                    required
                    type="text"
                    placeholder="path/to/profile"
                    value={formData.firefox_profile}
                    onChange={(e) => setFormData({...formData, firefox_profile: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-800"
                  />
                </div>
              </div>

              {activeTab === 'youtube' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">Niche</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Cooking"
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
              ) : (
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
              )}

              <button
                disabled={submitting}
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black tracking-tighter transition-all active:scale-[0.98] mt-4 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {submitting ? 'LINKING...' : 'INITIALIZE CONNECTION'}
              </button>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default AccountsPage;
