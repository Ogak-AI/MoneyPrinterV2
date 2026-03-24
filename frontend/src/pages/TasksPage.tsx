import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Play, Loader2, Youtube, Twitter, Zap, CheckCircle, XCircle, Briefcase } from 'lucide-react';

interface Account {
  id: string;
  nickname: string;
  provider: 'youtube' | 'twitter';
}

interface Task {
  task_id: string;
  status: string;
  message: string;
  provider: string;
}

const TasksPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [selectedAccount, setSelectedAccount] = useState('');
  const [provider, setProvider] = useState<'youtube' | 'twitter'>('youtube');
  const [niche, setNiche] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const [yt, tw] = await Promise.all([
          api.get('/accounts/youtube'),
          api.get('/accounts/twitter')
        ]);
        const allAccounts = [
          ...yt.data.map((a: any) => ({ ...a, provider: 'youtube' })),
          ...tw.data.map((a: any) => ({ ...a, provider: 'twitter' }))
        ];
        setAccounts(allAccounts);
      } catch (err) {
        console.error('Failed to fetch accounts', err);
      }
    };
    fetchAccounts();
  }, []);

  const handleRunTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let endpoint = '';
      let payload = {};
      
      if (provider === 'youtube') {
        endpoint = '/tasks/youtube/generate';
        payload = { account_id: selectedAccount, niche, upload: true };
      } else {
        endpoint = '/tasks/twitter/post';
        payload = { account_id: selectedAccount, text };
      }
      
      const response = await api.post(endpoint, payload);
      setTasks(prev => [{ ...response.data, provider }, ...prev]);
    } catch (err) {
      alert('Failed to start task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2 text-emerald-500">
            <Briefcase className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Operations Terminal</span>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter">Automation Center</h2>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Task Form */}
        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 h-fit sticky top-8">
          <h3 className="text-2xl font-black text-white tracking-tight mb-8 flex items-center gap-3">
            <Zap className="w-6 h-6 text-emerald-500" />
            Launch Task
          </h3>
          
          <form onSubmit={handleRunTask} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Service Provider</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setProvider('youtube'); setSelectedAccount(''); }}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-300 ${provider === 'youtube' ? 'bg-red-500/10 border-red-500/40 text-red-500 shadow-lg shadow-red-500/5' : 'bg-zinc-950/50 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                >
                  <Youtube className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setProvider('twitter'); setSelectedAccount(''); }}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-300 ${provider === 'twitter' ? 'bg-blue-500/10 border-blue-500/40 text-blue-500 shadow-lg shadow-blue-500/5' : 'bg-zinc-950/50 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                >
                  <Twitter className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Twitter</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Target Operator</label>
              <select
                required
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3.5 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors appearance-none font-bold text-sm"
              >
                <option value="" className="bg-zinc-950">Select Account...</option>
                {accounts.filter(a => a.provider === provider).map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-zinc-950">{acc.nickname}</option>
                ))}
              </select>
            </div>

            {provider === 'youtube' ? (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Niche Protocol (Optional)</label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. AI News / Motivation"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3.5 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors font-bold text-sm placeholder:text-zinc-800"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Broadcast Payload</label>
                <textarea
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter tweet content or instructions..."
                  rows={4}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3.5 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none font-bold text-sm placeholder:text-zinc-800"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedAccount}
              className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:grayscale text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              Execute Print
            </button>
          </form>
        </div>

        {/* Task History */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-4">
             <h3 className="text-xl font-black text-white tracking-tight uppercase tracking-[0.1em]">Stream Log</h3>
             <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Real-time updates</span>
          </div>
          
          <div className="space-y-4">
            {tasks.length === 0 && (
              <div className="bg-zinc-900/20 border-2 border-dashed border-zinc-800/50 rounded-[2.5rem] p-24 text-center">
                <Briefcase className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No active operations in the stream</p>
              </div>
            )}
            {tasks.map((task) => (
              <div key={task.task_id} className="group bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 flex items-center justify-between hover:border-emerald-500/20 transition-all duration-300">
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-2xl ${task.provider === 'youtube' ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-blue-500/10 border border-blue-500/20 text-blue-500'}`}>
                    {task.provider === 'youtube' ? <Youtube className="w-6 h-6" /> : <Twitter className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-black text-white tracking-tight text-lg">{task.message}</p>
                      <span className="text-[10px] font-bold text-zinc-700 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900 uppercase">Task ID: {task.task_id.slice(0,8)}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       Service Provider: {task.provider.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-[0.15em] ${
                    task.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    task.status === 'failed' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    'bg-zinc-950 border-zinc-800 text-emerald-500 animate-pulse'
                  }`}>
                    {task.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : 
                     task.status === 'failed' ? <XCircle className="w-3 h-3" /> : 
                     <Loader2 className="w-3 h-3 animate-spin" />}
                    {task.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
