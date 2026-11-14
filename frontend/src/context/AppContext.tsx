import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PageView, DashboardTab } from '../types';

interface AppContextType {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  user: User;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  setUserSession: (user: User) => void;
  logout: () => void;
}

// By default, user starts logged out so Dashboard is strictly protected!
const unauthenticatedUser: User = {
  email: '',
  name: 'Guest',
  role: 'Viewer',
  isLoggedIn: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('gaitvision_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isLoggedIn) return parsed;
      } catch {
        // ignore
      }
    }
    return unauthenticatedUser;
  });

  const [currentPage, setCurrentPageState] = useState<PageView>('landing');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('gaitvision_user', JSON.stringify(user));
  }, [user]);

  // Protected route enforcement: if not logged in, forbid dashboard and open Login modal
  const setCurrentPage = (page: PageView) => {
    if (page === 'dashboard' && !user.isLoggedIn) {
      setIsLoginModalOpen(true);
      return;
    }
    setCurrentPageState(page);
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const setUserSession = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsLoginModalOpen(false);
    // Automatically transition to dashboard upon successful authentication!
    setCurrentPageState('dashboard');
  };

  const logout = () => {
    setUser(unauthenticatedUser);
    localStorage.removeItem('gaitvision_user');
    setCurrentPageState('landing');
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        activeTab,
        setActiveTab,
        user,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        setUserSession,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
