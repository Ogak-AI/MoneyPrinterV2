import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LogOut, LayoutDashboard, UserCircle, Briefcase, PlayCircle, ChevronRight } from 'lucide-react';

// Lazy loading pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AccountsPage = React.lazy(() => import('./pages/AccountsPage'));
const TasksPage = React.lazy(() => import('./pages/TasksPage'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isInitialized } = useAuthStore();
  
  if (!isInitialized) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-emerald-500">
      <div className="animate-pulse">Loading MoneyPrinter...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const TickerBackground = () => (
  <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden select-none z-0">
    <div className="whitespace-nowrap animate-marquee py-4 text-8xl font-black text-white">
      MONEYPRINTERV2 AUTOMATION PRINTING CONTENT CASHFLOW SCALE PROFIT REPEAT &nbsp;
      MONEYPRINTERV2 AUTOMATION PRINTING CONTENT CASHFLOW SCALE PROFIT REPEAT &nbsp;
    </div>
    <div className="whitespace-nowrap animate-marquee py-4 text-8xl font-black text-white" style={{ animationDirection: 'reverse' }}>
      YOUTUBE TWITTER SHORTS TWEETS REELS VIRAL GROWTH MONEYPRINTERV2 &nbsp;
      YOUTUBE TWITTER SHORTS TWEETS REELS VIRAL GROWTH MONEYPRINTERV2 &nbsp;
    </div>
  </div>
);

const NavLink = ({ to, children, icon: Icon }: { to: string, children: React.ReactNode, icon: any }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-500' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
        <span className="font-medium">{children}</span>
      </div>
      {isActive && <ChevronRight className="w-4 h-4" />}
    </Link>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuthStore();
  
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 selection:bg-emerald-500/30">
      <TickerBackground />
      
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-900 bg-zinc-950/50 backdrop-blur-xl flex flex-col z-10">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              MoneyPrinter<span className="text-emerald-500">V2</span>
            </h1>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5">
          <div className="px-4 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Core Services</p>
          </div>
          <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
          <NavLink to="/accounts" icon={UserCircle}>Accounts</NavLink>
          <NavLink to="/tasks" icon={Briefcase}>Automation</NavLink>
        </nav>
        
        <div className="p-4 border-t border-zinc-900 bg-zinc-900/20">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
                {user.email[0].toUpperCase()}
              </div>
              <div className="truncate flex-1">
                <p className="text-sm font-bold text-zinc-100 truncate">{user.email.split('@')[0]}</p>
                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-tighter">Pro Member</p>
              </div>
            </div>
          )}
          <button 
            onClick={logout}
            className="flex w-full items-center justify-center gap-3 px-3 py-3 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        <div className="max-w-7xl mx-auto p-12">
          <React.Suspense fallback={
            <div className="flex h-[60vh] items-center justify-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            {children}
          </React.Suspense>
        </div>
      </main>
    </div>
  );
};

function App() {
  const { initialize } = useAuthStore();
  
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route path="/login" element={
        <React.Suspense fallback={null}>
          <LoginPage />
        </React.Suspense>
      } />
      <Route path="/register" element={
        <React.Suspense fallback={null}>
          <RegisterPage />
        </React.Suspense>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/accounts" element={
        <ProtectedRoute>
          <Layout><AccountsPage /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tasks" element={
        <ProtectedRoute>
          <Layout><TasksPage /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
