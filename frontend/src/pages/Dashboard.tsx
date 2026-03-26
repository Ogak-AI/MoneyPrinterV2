import { Activity, Users, Play, CheckCircle, TrendingUp, ArrowUpRight } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { label: 'ACTIVE CHANNELS', value: '12', icon: Users, color: 'text-emerald-500', trend: '+2 this week' },
    { label: 'TASKS RUNNING', value: '03', icon: Play, color: 'text-emerald-400', trend: 'Optimal speed' },
    { label: 'CONTENT PRINTED', value: '1,284', icon: CheckCircle, color: 'text-emerald-600', trend: 'Total lifetime' },
    { label: 'SYSTEM UPTIME', value: '99.9%', icon: Activity, color: 'text-emerald-500', trend: 'All systems green' },
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
             Active Automation Stream
          </h3>
          
          <div className="space-y-6">
            <div className="bg-zinc-950/50 border border-zinc-800/50 p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center font-bold text-emerald-500">YT</div>
                  <div>
                    <p className="font-bold text-white text-sm">TechReviews_Shorts</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Rendering Video #402</p>
                  </div>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md uppercase mb-2">Processing</span>
                  <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="w-[65%] h-full bg-emerald-500 animate-pulse"></div>
                  </div>
               </div>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800/50 p-6 rounded-2xl flex items-center justify-between opacity-50">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center font-bold text-zinc-500">TW</div>
                  <div>
                    <p className="font-bold text-white text-sm">CryptoAlerts_Bot</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Scheduled for 14:00 GMT</p>
                  </div>
               </div>
               <span className="text-[10px] font-black text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md uppercase">Standby</span>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 flex flex-col justify-between group">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-4">Print Capacity</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
              Your system is currently utilizing 24% of its total printing capacity. 
              Add more accounts to scale your cashflow.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Efficiency</span>
              <span className="text-2xl font-black text-white">88%</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 w-[88%] group-hover:animate-pulse transition-all"></div>
            </div>
            <button className="w-full mt-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all">
              Upgrade Terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
