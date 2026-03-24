import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Youtube, Twitter, Plus, Trash2, ShieldCheck, Globe, ChevronRight, UserCircle } from 'lucide-react';

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
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-600/20 text-sm">
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
    </div>
  );
};

export default AccountsPage;
