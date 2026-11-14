import React from 'react';
import { useApp } from '../context/AppContext';
import { Shield, ArrowRight, UserCheck, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentPage, setCurrentPage, openLoginModal, user, logout } = useApp();

  return (
    <header className="sticky top-0 z-40 h-[72px] bg-bg-main/90 border-b border-borderLine/80 backdrop-blur-md px-6 sm:px-12 flex items-center justify-between transition-all">
      {/* Brand logo: WalkTrace */}
      <div 
        onClick={() => setCurrentPage('landing')}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center text-bg-main font-black text-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
          <Shield className="w-5 h-5 text-bg-main" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white">
              Walk<span className="text-brand-cyan">Trace</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-panel border border-brand-cyan/30 text-brand-cyan">
              v2.4
            </span>
          </div>
          <p className="text-[9px] font-semibold tracking-wider text-muted uppercase">
            Intelligent Gait Surveillance
          </p>
        </div>
      </div>

      {/* Nav links (Only when in landing view) */}
      {currentPage === 'landing' ? (
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
          <a href="#features" className="hover:text-brand-cyan transition-colors">Platform Capabilities</a>
          <a href="#workflow" className="hover:text-brand-cyan transition-colors">How It Works</a>
          <a href="#about" className="hover:text-brand-cyan transition-colors">About</a>
        </nav>
      ) : (
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-panel border border-borderLine">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            <span className="text-white font-medium">WalkTrace Node Active</span>
            <span className="text-muted">•</span>
            <span className="font-mono text-brand-cyan text-[11px]">{user.role}</span>
          </div>
        </div>
      )}

      {/* Right Action buttons */}
      <div className="flex items-center gap-3">
        {currentPage === 'landing' ? (
          <>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-bg-panel border border-borderLine text-slate-200 hover:text-white hover:border-brand-cyan transition-all flex items-center gap-1.5"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand-cyan" />
            </button>
            <button
              onClick={openLoginModal}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{user.isLoggedIn ? user.name : 'Sign In'}</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setCurrentPage('landing')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-bg-panel border border-borderLine text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              Public Home
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-borderLine">
              <button
                onClick={openLoginModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-panel border border-borderLine hover:border-brand-cyan transition-colors text-left"
              >
                <div className="w-6 h-6 rounded bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-[11px] font-semibold text-white leading-tight">{user.name}</div>
                  <div className="text-[9px] text-brand-cyan font-mono leading-none">{user.role}</div>
                </div>
              </button>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-lg bg-bg-panel border border-borderLine text-muted hover:text-brand-red transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
