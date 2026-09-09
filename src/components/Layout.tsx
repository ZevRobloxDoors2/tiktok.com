import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, PlusSquare, MessageSquare, User, Moon, Sun, LogIn } from 'lucide-react';
import { useAppStore } from '../store';
import { AuthModal } from './AuthModal';

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, theme, toggleTheme } = useAppStore();
  const [showAuth, setShowAuth] = useState(false);
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'For You', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: User, label: 'Profile', path: currentUser ? `/profile/${currentUser.handle}` : '#' },
  ];

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (path === '#' || (['/messages', '/upload'].includes(path) && !currentUser)) {
      e.preventDefault();
      setShowAuth(true);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden transition-colors">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 p-4 shrink-0 h-full">
        <Link to="/" className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center font-bold text-xl leading-none">C</div>
          <span className="text-xl font-bold tracking-tight">CentralTok</span>
        </Link>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label} 
                to={item.path}
                onClick={(e) => handleNavClick(e, item.path)}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors ${isActive ? 'text-pink-600 font-bold bg-pink-50 dark:bg-pink-950/30' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium'}`}
              >
                <item.icon className={isActive ? 'fill-current' : ''} size={26} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-lg">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
          <Link 
            to="/upload"
            onClick={(e) => handleNavClick(e, '/upload')}
            className="flex items-center justify-center gap-2 w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            <PlusSquare size={20} />
            <span>Upload</span>
          </Link>
          
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors font-medium"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          
          {!currentUser ? (
            <button 
              onClick={() => setShowAuth(true)}
              className="flex items-center justify-center gap-2 w-full border-2 border-pink-600 text-pink-600 dark:text-pink-500 py-2 rounded-xl font-semibold hover:bg-pink-50 dark:hover:bg-pink-950/20 transition-colors"
            >
              <LogIn size={20} />
              <span>Log in</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2">
              <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{currentUser.username}</p>
                <p className="text-xs text-zinc-500 truncate">@{currentUser.handle}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative h-full overflow-hidden flex justify-center">
        {children}
      </main>
      
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around p-3 z-40">
        {navItems.slice(0, 2).map((item) => (
          <Link key={item.label} to={item.path} onClick={(e) => handleNavClick(e, item.path)} className="p-2">
            <item.icon size={24} className={location.pathname === item.path ? 'text-pink-600 fill-current' : 'text-zinc-500'} />
          </Link>
        ))}
        <Link to="/upload" onClick={(e) => handleNavClick(e, '/upload')} className="p-2">
          <div className="w-11 h-8 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 p-[2px] flex items-center justify-center">
            <div className="bg-white dark:bg-zinc-950 w-full h-full rounded-[10px] flex items-center justify-center">
              <PlusSquare size={20} className="text-zinc-900 dark:text-white" />
            </div>
          </div>
        </Link>
        {navItems.slice(2).map((item) => (
          <Link key={item.label} to={item.path} onClick={(e) => handleNavClick(e, item.path)} className="p-2">
            <item.icon size={24} className={location.pathname === item.path ? 'text-pink-600 fill-current' : 'text-zinc-500'} />
          </Link>
        ))}
      </div>
      
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
