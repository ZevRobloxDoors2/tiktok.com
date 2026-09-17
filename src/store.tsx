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
  showAuthModal: boolean;
  setShowAuthModal: (val: boolean) => void;
  isGameActive: boolean;
  setIsGameActive: (val: boolean) => void;
  activeGameUrl: string;
  setActiveGameUrl: (url: string) => void;
  miniPlayerActive: boolean;
  setMiniPlayerActive: (val: boolean) => void;
  miniPlayerUrl: string;
  setMiniPlayerUrl: (url: string) => void;
  miniPlayerTitle: string;
  setMiniPlayerTitle: (title: string) => void;
  activeStory: { userId: string; user: User } | null;
  setActiveStory: (story: { userId: string; user: User } | null) => void;
  isCalling: boolean;
  setIsCalling: (val: boolean) => void;
  callData: { user: User; type: 'voice' | 'video' } | null;
  setCallData: (data: { user: User; type: 'voice' | 'video' } | null) => void;
};

const StoreContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [introPhase, setIntroPhase] = useState<'loading' | 'merging' | 'expanding' | 'done'>('loading');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [activeGameUrl, setActiveGameUrl] = useState('');
  const [miniPlayerActive, setMiniPlayerActive] = useState(false);
  const [miniPlayerUrl, setMiniPlayerUrl] = useState('');
  const [miniPlayerTitle, setMiniPlayerTitle] = useState('');
  const [activeStory, setActiveStory] = useState<{ userId: string; user: User } | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callData, setCallData] = useState<{ user: User; type: 'voice' | 'video' } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
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
    <StoreContext.Provider value={{ 
      currentUser, 
      setCurrentUser: handleSetUser, 
      theme, 
      toggleTheme, 
      isLoading, 
      introPhase, 
      setIntroPhase, 
      showAuthModal, 
      setShowAuthModal,
      isGameActive,
      setIsGameActive,
      activeGameUrl,
      setActiveGameUrl,
      miniPlayerActive,
      setMiniPlayerActive,
      miniPlayerUrl,
      setMiniPlayerUrl,
      miniPlayerTitle,
      setMiniPlayerTitle,
      activeStory,
      setActiveStory,
      isCalling,
      setIsCalling,
      callData,
      setCallData
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useAppStore must be used within an AppProvider');
  return context;
}
