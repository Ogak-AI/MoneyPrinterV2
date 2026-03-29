import { Link } from 'react-router-dom';
import { 
  PlayCircle, 
  TrendingUp, 
  Zap, 
  Shield, 
  Globe, 
  ArrowRight,
  Youtube,
  Twitter,
  ChevronRight,
  BarChart3,
  Cpu
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden select-none z-0">
        <div className="whitespace-nowrap animate-marquee py-4 text-[15rem] font-black text-white">
          MONEYPRINTERV2 AUTOMATION PRINTING CONTENT CASHFLOW SCALE PROFIT REPEAT &nbsp;
          MONEYPRINTERV2 AUTOMATION PRINTING CONTENT CASHFLOW SCALE PROFIT REPEAT &nbsp;
        </div>
        <div className="whitespace-nowrap animate-marquee py-4 text-[15rem] font-black text-white" style={{ animationDirection: 'reverse' }}>
          YOUTUBE TWITTER SHORTS TWEETS REELS VIRAL GROWTH MONEYPRINTERV2 &nbsp;
          YOUTUBE TWITTER SHORTS TWEETS REELS VIRAL GROWTH MONEYPRINTERV2 &nbsp;
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 transition-all duration-300 group-hover:rotate-12">
            <PlayCircle className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white">
            MoneyPrinter<span className="text-emerald-500 uppercase">V2</span>
          </h1>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-zinc-500">
          <a href="#features" className="hover:text-emerald-500 transition-colors">Features</a>
          <a href="#workflow" className="hover:text-emerald-500 transition-colors">Workflow</a>
          <a href="#network" className="hover:text-emerald-500 transition-colors">Network</a>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/login" className="px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/register" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-8 animate-fade-in">
          <Zap className="w-4 h-4 fill-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Automated Content Engine v2.0 is Live</span>
        </div>

        <h2 className="text-7xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter leading-[0.85] mb-8">
          PRINT CONTENT.<br />
          <span className="text-emerald-500">SCALE REVENUE.</span>
        </h2>

        <p className="max-w-2xl mx-auto text-zinc-400 text-lg md:text-xl font-medium mb-12 leading-relaxed">
          The ultimate automation terminal for YouTube and Twitter. Generate, optimize, and distribute viral content at scale without lifting a finger.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/register" className="group flex items-center gap-3 px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all duration-500 hover:scale-105">
            Start Printing Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/login" className="flex items-center gap-3 px-10 py-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-zinc-700 transition-all duration-300">
            View Live Demo
          </Link>
        </div>

        {/* Hero Mockup/Visual */}
        <div className="mt-24 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[120px] rounded-full opacity-20"></div>
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-4 shadow-2xl">
            <div className="bg-zinc-950 rounded-[1.5rem] overflow-hidden border border-zinc-800 aspect-video flex flex-col">
              {/* Fake Terminal Header */}
              <div className="bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-800">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                  <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                  <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                </div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">moneyprinter-terminal --active</div>
                <div className="w-10"></div>
              </div>
              {/* Fake Content */}
              <div className="flex-1 p-8 font-mono text-xs text-emerald-500/80 space-y-2 text-left">
                <p>&gt; Initializing MoneyPrinterV2 Engine...</p>
                <p className="text-zinc-500">[SYSTEM] Connecting to YouTube API... SUCCESS</p>
                <p className="text-zinc-500">[SYSTEM] Connecting to Twitter X API... SUCCESS</p>
                <p>&gt; Analyzing viral trends in "Finance" niche...</p>
                <p className="text-white font-bold">&gt; Found 12 high-potential hooks. Generating scripts...</p>
                <p>&gt; Rendering video content #001... [||||||||||||||--------] 65%</p>
                <p className="text-zinc-500">[BOT-01] Scheduled post to @ChannelName at 18:00 UTC</p>
                <p className="text-emerald-400 animate-pulse">&gt; PRINTING PROFIT...</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stats/Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-10 bg-zinc-900/30 border border-zinc-800/50 rounded-[3rem] hover:border-emerald-500/30 transition-all duration-500 group">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Cpu className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">AI Generation</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">
              Leverage advanced LLMs to generate viral scripts, captions, and threads tailored for your specific audience.
            </p>
          </div>

          <div className="p-10 bg-zinc-900/30 border border-zinc-800/50 rounded-[3rem] hover:border-emerald-500/30 transition-all duration-500 group">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Multi-Platform</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">
              One dashboard to rule them all. Manage dozens of YouTube channels and Twitter accounts simultaneously.
            </p>
          </div>

          <div className="p-10 bg-zinc-900/30 border border-zinc-800/50 rounded-[3rem] hover:border-emerald-500/30 transition-all duration-500 group">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Enterprise Grade</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">
              Secure, reliable, and built for scale. Your automation runs 24/7 on our optimized infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="relative z-10 max-w-7xl mx-auto px-8 py-32 border-t border-zinc-900/50">
        <div className="text-center mb-20">
          <p className="text-emerald-500 text-[10px] font-black tracking-[0.3em] uppercase mb-4">Process</p>
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase">How It Works</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Connect", desc: "Link your YouTube and Twitter accounts securely." },
            { step: "02", title: "Research", desc: "AI analyzes trends and generates viral content ideas." },
            { step: "03", title: "Print", desc: "High-quality videos and threads are rendered and staged." },
            { step: "04", title: "Scale", desc: "Automate scheduling across multiple operators." }
          ].map((item, idx) => (
            <div key={idx} className="relative p-8 bg-zinc-900/20 border border-zinc-800/30 rounded-3xl group hover:bg-zinc-900/40 transition-all duration-300">
              <span className="text-6xl font-black text-zinc-800/30 absolute -top-4 -left-4 group-hover:text-emerald-500/10 transition-colors">{item.step}</span>
              <h4 className="text-xl font-black text-white mb-2 relative z-10 uppercase tracking-tight">{item.title}</h4>
              <p className="text-zinc-500 text-sm font-medium relative z-10">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integration Section */}
      <section id="network" className="relative z-10 bg-zinc-900/20 py-32 border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1">
              <p className="text-emerald-500 text-[10px] font-black tracking-[0.3em] uppercase mb-4">Integrations</p>
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-none">
                BUILT FOR THE<br /> MODERN WEB.
              </h2>
              <p className="text-zinc-400 text-lg font-medium mb-10">
                MoneyPrinterV2 connects seamlessly with the platforms where your audience lives. From long-form video to short-form threads, we cover the entire spectrum of digital presence.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                    <Youtube className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-bold uppercase tracking-widest text-sm">YouTube Shorts & Video</p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">Automated Uploads & Metadata</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <div className="w-10 h-10 bg-blue-400/10 rounded-xl flex items-center justify-center text-blue-400">
                    <Twitter className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-bold uppercase tracking-widest text-sm">Twitter Threads & Tweets</p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">Viral Engagement Automation</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-6">
              <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800 flex flex-col items-center justify-center text-center space-y-4">
                <BarChart3 className="w-10 h-10 text-emerald-500" />
                <p className="text-3xl font-black text-white tracking-tighter">1.2M+</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Videos Printed</p>
              </div>
              <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800 flex flex-col items-center justify-center text-center space-y-4 mt-12">
                <TrendingUp className="w-10 h-10 text-emerald-500" />
                <p className="text-3xl font-black text-white tracking-tighter">24/7</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Uptime Guaranteed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-8 py-32 text-center">
        <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-12">
          READY TO START<br /> YOUR EMPIRE?
        </h2>
        <Link to="/register" className="inline-flex items-center gap-4 px-12 py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all duration-500 hover:scale-110 shadow-2xl shadow-emerald-900/40">
          Create Your Account
          <ChevronRight className="w-6 h-6" />
        </Link>
        
        <div className="mt-32 pt-12 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
              <PlayCircle className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              MoneyPrinterV2 © 2026. All Rights Reserved.
            </p>
          </div>
          
          <div className="flex items-center gap-8">
            <a href="#" className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Terms</a>
            <a href="#" className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Privacy</a>
            <a href="#" className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
