import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, PlusSquare, MessageSquare, User, Moon, Sun, LogIn, ShieldAlert, X } from 'lucide-react';
import { useAppStore } from '../store';
import { AuthModal } from './AuthModal';
import { saveReports } from '../lib/db';

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, theme, toggleTheme, introPhase } = useAppStore();
  const [showAuth, setShowAuth] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportType, setSupportType] = useState<'support' | 'bug' | null>(null);
  const [supportSent, setSupportSent] = useState(false);
  const location = useLocation();
  const isIntro = location.pathname === '/' && introPhase !== 'done';

  const handleSupportSubmit = async () => {
    if (!supportMessage.trim()) return;
    const { getReports, saveReports } = await import('../lib/db');
    const reports = await getReports();
    reports.push({
      id: `support_${Date.now()}`,
      videoId: 'general_support',
      reporterId: currentUser?.id || 'anonymous',
      reason: `${supportType === 'bug' ? 'Bug/Issue' : 'Support'}: ${supportMessage}`,
      timestamp: Date.now(),
      status: 'pending',
      category: supportType || 'support'
    });
    await saveReports(reports);
    setSupportSent(true);
    setTimeout(() => {
      setShowSupportModal(false);
      setSupportSent(false);
      setSupportMessage('');
      setSupportType(null);
    }, 2000);
  };

  const navItems = [
    { icon: Home, label: 'For You', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: User, label: 'Profile', path: currentUser ? `/profile/${currentUser.handle}` : '#' },
  ];

  if (currentUser?.role === 'staff' || currentUser?.role === 'owner') {
    navItems.push({ icon: ShieldAlert, label: 'Moderation', path: '/admin' });
  }

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (path === '#' || (['/messages', '/upload'].includes(path) && !currentUser)) {
      e.preventDefault();
      setShowAuth(true);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden transition-colors">
      {/* Sidebar - Desktop */}
      {!isIntro && (
        <div className="hidden md:flex w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 p-4 shrink-0 h-full">
          <Link to="/" className="flex flex-col gap-1 mb-8 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center font-bold text-xl leading-none">C</div>
              <span className="text-xl font-bold tracking-tight">CentralTok</span>
            </div>
          </Link>
          <div className="text-xs text-zinc-500 mb-6 bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 leading-relaxed">
            <span className="font-bold text-pink-600 dark:text-pink-400 block mb-1">BETA v0.9</span> 
            This is in BETA, some bugs might appear, if they somehow appear please go to <button onClick={() => setShowSupportModal(true)} className="text-blue-500 dark:text-blue-400 hover:underline font-semibold inline">support</button>
          </div>
        
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
      )}

      {/* Main Content */}
      <main className="flex-1 relative h-full overflow-hidden flex justify-center">
        {children}
      </main>
      
      {/* Mobile Bottom Nav */}
      {!isIntro && (
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
      )}
      
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      
      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShieldAlert size={24} className="text-pink-600" /> Support & Bug Report
              </h3>
              <button onClick={() => setShowSupportModal(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {supportSent ? (
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-xl text-center font-medium">
                Your report has been sent to the staff. Thank you!
              </div>
            ) : !supportType ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Choose a request type.</p>
                <button onClick={() => setSupportType('support')} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl">Support</button>
                <button onClick={() => setSupportType('bug')} className="w-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-bold py-3 rounded-xl">Bugs/Issues</button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">State your issue, and wait until a staff replies.</p>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="What happened?"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-pink-500 focus:bg-white dark:focus:bg-black transition-all resize-none"
                />
                <button
                  onClick={handleSupportSubmit}
                  disabled={!supportMessage.trim()}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors"
                >
                  Send to Staff
                </button>
                <button onClick={() => setSupportType(null)} className="w-full text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Back</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
