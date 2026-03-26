import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Activity, Users, Play, CheckCircle, TrendingUp, ArrowUpRight, Youtube, Twitter } from 'lucide-react';

interface Account {
  id: string;
  nickname: string;
  provider: 'youtube' | 'twitter';
}

interface Task {
  task_id: string;
  status: string;
  message: string;
  provider?: string;
}

const Dashboard = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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
        
        // In a real scenario, we might have a /tasks endpoint to get all recent tasks
        // For now, we'll keep the tasks state from recent operations if available
        // Or leave it empty if fresh load
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeTasksCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length;

  const stats = [
    { 
      label: 'ACTIVE ACCOUNTS', 
      value: loading ? '...' : accounts.length.toString(), 
      icon: Users, 
      color: 'text-emerald-500', 
      trend: `${accounts.filter(a => a.provider === 'youtube').length} YT / ${accounts.filter(a => a.provider === 'twitter').length} TW` 
    },
    { 
      label: 'TASKS RUNNING', 
      value: activeTasksCount.toString().padStart(2, '0'), 
      icon: Play, 
      color: 'text-emerald-400', 
      trend: 'Real-time status' 
    },
    { 
      label: 'CONTENT PRINTED', 
      value: '1,284', // Placeholder until backend tracks total lifetime prints
      icon: CheckCircle, 
      color: 'text-emerald-600', 
      trend: 'Total lifetime' 
    },
    { 
      label: 'SYSTEM UPTIME', 
      value: '99.9%', 
      icon: Activity, 
      color: 'text-emerald-500', 
      trend: 'All systems green' 
    },
  ];

  return (
    <div className="space-y-12 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2 text-emerald-500">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">System Overview</span>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter">Terminal Dashboard</h2>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Network Status</p>
          <p className="text-emerald-500 text-sm font-black tracking-tighter">OPERATIONAL</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="group relative bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2rem] hover:border-emerald-500/30 transition-all duration-300">
            <div className={`mb-6 p-3 w-fit rounded-2xl bg-zinc-950/50 border border-zinc-800 group-hover:scale-110 transition-transform duration-300 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black tracking-[0.15em] text-zinc-500 uppercase mb-1">{stat.label}</p>
            <p className="text-4xl font-black text-white tracking-tighter mb-2">{stat.value}</p>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">{stat.trend}</p>
            
            <ArrowUpRight className="absolute top-8 right-8 w-5 h-5 text-zinc-800 group-hover:text-emerald-500 transition-colors" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <Activity className="w-40 h-40 text-white" />
          </div>
          
          <h3 className="text-2xl font-black text-white tracking-tight mb-8 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
             Live Activity Feed
          </h3>
          
          <div className="space-y-6">
            {tasks.length === 0 ? (
               <div className="py-20 text-center border-2 border-dashed border-zinc-800/50 rounded-3xl">
                  <Activity className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No active automation detected</p>
               </div>
            ) : (
              tasks.slice(0, 3).map((task) => (
                <div key={task.task_id} className="bg-zinc-950/50 border border-zinc-800/50 p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center font-bold ${task.provider === 'youtube' ? 'text-red-500' : 'text-blue-500'}`}>
                        {task.provider === 'youtube' ? 'YT' : 'TW'}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{task.message}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">{task.status}</p>
                      </div>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md uppercase mb-2">
                        {task.status === 'running' ? 'Processing' : task.status}
                      </span>
                      {task.status === 'running' && (
                        <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="w-[65%] h-full bg-emerald-500 animate-pulse"></div>
                        </div>
                      )}
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 flex flex-col justify-between group">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-4">Account Status</h3>
            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <span className="text-xs font-bold text-white">YouTube</span>
                </div>
                <span className="text-xs font-black text-zinc-400">{accounts.filter(a => a.provider === 'youtube').length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3">
                  <Twitter className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-bold text-white">Twitter</span>
                </div>
                <span className="text-xs font-black text-zinc-400">{accounts.filter(a => a.provider === 'twitter').length}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-8">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Network Load</span>
              <span className="text-2xl font-black text-white">
                {loading ? '...' : Math.min(100, accounts.length * 10)}%
              </span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
               <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000"
                style={{ width: `${loading ? 0 : Math.min(100, accounts.length * 10)}%` }}
               ></div>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase text-center mt-2">
              Scale your cashflow by adding more operators
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
