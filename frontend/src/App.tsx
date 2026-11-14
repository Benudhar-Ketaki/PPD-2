import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';

export const AppContent: React.FC = () => {
  const { currentPage } = useApp();

  return (
    <div className="min-h-screen bg-bg-main text-slate-100 flex flex-col font-sans selection:bg-brand-cyan/20 selection:text-brand-cyan">
      <Navbar />
      <main className="flex-1">
        {currentPage === 'landing' ? <LandingPage /> : <DashboardPage />}
      </main>
      <LoginModal />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
