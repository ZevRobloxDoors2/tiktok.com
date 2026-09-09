import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Video, Notification } from './types';
import { getUsers, getVideos, initDb } from './lib/db';

type AppState = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isLoading: boolean;
  introPhase: 'loading' | 'merging' | 'expanding' | 'done';
  setIntroPhase: (phase: 'loading' | 'merging' | 'expanding' | 'done') => void;
};

const StoreContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [introPhase, setIntroPhase] = useState<'loading' | 'merging' | 'expanding' | 'done'>('loading');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const loadData = async () => {
      await initDb();
      const currentUserId = localStorage.getItem('currentUserId');
      if (currentUserId) {
        const users = await getUsers();
        const user = users.find(u => u.id === currentUserId);
        if (user) {
          setCurrentUser(user);
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleSetUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('currentUserId', user.id);
    } else {
      localStorage.removeItem('currentUserId');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <StoreContext.Provider value={{ currentUser, setCurrentUser: handleSetUser, theme, toggleTheme, isLoading, introPhase, setIntroPhase }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useAppStore must be used within an AppProvider');
  return context;
}
