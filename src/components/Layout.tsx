import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, PlusSquare, MessageSquare, User, Moon, Sun, LogIn, ShieldAlert, X, HelpCircle, Bell } from 'lucide-react';
import { useAppStore } from '../store';
import { AuthModal } from './AuthModal';
import { saveReports, getMessages, getUsers, getNotifications, markNotificationAsRead, getFAQPosts } from '../lib/db';

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, theme, toggleTheme, introPhase, showAuthModal, setShowAuthModal } = useAppStore();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportType, setSupportType] = useState<'support' | 'bug' | null>(null);
  const [supportSent, setSupportSent] = useState(false);
  const [messageToast, setMessageToast] = useState<{username: string; avatarUrl: string; handle: string} | null>(null);
  const [forumToast, setForumToast] = useState<{
    id: string;
    title: string;
    authorName: string;
    authorAvatar?: string;
  } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const knownMessageIds = useRef<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const isIntro = location.pathname === '/' && introPhase !== 'done';

  useEffect(() => {
    if (!currentUser) return;
    let initialized = false;
    const checkMessages = async () => {
      const [messages, users] = await Promise.all([getMessages(), getUsers()]);
      const incoming = messages.filter(message => message.toUserId === currentUser.id);
      const unread = incoming.filter(m => !m.read).length;
      setUnreadCount(unread);

      if (!initialized) {
        incoming.forEach(message => knownMessageIds.current.add(message.id));
        initialized = true;
        return;
      }
      const fresh = incoming.find(message => !knownMessageIds.current.has(message.id));
      incoming.forEach(message => knownMessageIds.current.add(message.id));
      if (!fresh) return;
      const sender = users.find(user => user.id === fresh.fromUserId);
      if (!sender) return;
      setMessageToast({username: sender.username, avatarUrl: sender.avatarUrl, handle: sender.handle});
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(sender.username, {body: 'New messages was sent', icon: sender.avatarUrl});
      }
    };
    checkMessages();
    const interval = setInterval(checkMessages, 2000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Check announcements - when offline user arrives/comes online, this delivers their pending announcement notification immediately
  useEffect(() => {
    let active = true;
    const checkAnnouncements = async () => {
      try {
        const [allNotifs, allUsers, allPosts] = await Promise.all([
          getNotifications(),
          getUsers(),
          getFAQPosts()
        ]);

        if (!active) return;

        if (currentUser) {
          const unreadForumNotifs = allNotifs.filter(
            n => n.userId === currentUser.id && n.type === 'forum_announcement' && !n.read
          );

          if (unreadForumNotifs.length > 0) {
            const latest = unreadForumNotifs.sort((a, b) => b.timestamp - a.timestamp)[0];
            const sessionKey = `ct_shown_forum_${latest.id}`;
            if (!sessionStorage.getItem(sessionKey)) {
              sessionStorage.setItem(sessionKey, 'true');
              const author = allUsers.find(u => u.id === latest.fromUserId);
              setForumToast({
                id: latest.id,
                title: latest.title || 'New Forum Announcement',
                authorName: author?.username || 'Staff Team',
                authorAvatar: author?.avatarUrl
              });

              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('📢 CentralTok Announcement', {
                  body: latest.title || 'New Forum announcement posted',
                  icon: author?.avatarUrl
                });
              }
            }
          }
        } else {
          // Guest online arrival check
          if (allPosts.length > 0) {
            const latestPost = allPosts.sort((a, b) => b.timestamp - a.timestamp)[0];
            const isRecent = Date.now() - latestPost.timestamp < 1000 * 60 * 60 * 24;
            const seenKey = `ct_guest_seen_post_${latestPost.id}`;
            if (isRecent && !localStorage.getItem(seenKey) && !sessionStorage.getItem(seenKey)) {
              sessionStorage.setItem(seenKey, 'true');
              const author = allUsers.find(u => u.id === latestPost.authorId);
              setForumToast({
                id: latestPost.id,
                title: latestPost.title,
                authorName: author?.username || 'Staff Team',
                authorAvatar: author?.avatarUrl
              });
            }
          }
        }
      } catch (err) {
        console.warn('Announcement poll error:', err);
      }
    };

    checkAnnouncements();
    const interval = setInterval(checkAnnouncements, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser?.id]);

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
    { icon: HelpCircle, label: 'Forum', path: '/forum' },
  ];

  if (currentUser?.role === 'staff' || currentUser?.role === 'owner') {
    navItems.push({ icon: ShieldAlert, label: 'Moderation', path: '/admin' });
  }

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (path === '#' || (['/messages', '/upload'].includes(path) && !currentUser)) {
      e.preventDefault();
      setShowAuthModal(true);
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
            const isMessages = item.label === 'Messages';
            return (
              <Link 
                key={item.label} 
                to={item.path}
                onClick={(e) => handleNavClick(e, item.path)}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors relative ${isActive ? 'text-pink-600 font-bold bg-pink-50 dark:bg-pink-950/30' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium'}`}
              >
                <item.icon className={isActive ? 'fill-current' : ''} size={26} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-lg">{item.label}</span>
                {isMessages && unreadCount > 0 && (
                  <span className="ml-auto bg-pink-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {unreadCount}
                  </span>
                )}
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
              onClick={() => setShowAuthModal(true)}
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

      {/* Forum Announcement Toast (Triggered immediately when user comes online) */}
      {forumToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[130] w-[94%] max-w-md bg-[#1e1f22] text-white border border-[#5865F2] rounded-2xl p-3.5 shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center shrink-0 text-white font-bold text-lg shadow-md">
            📢
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#5865F2] uppercase tracking-wide">Forum Announcement</span>
              <span className="text-[11px] text-zinc-400 truncate">@{forumToast.authorName}</span>
            </div>
            <p className="text-sm font-semibold truncate text-white mt-0.5">{forumToast.title}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={async () => {
                if (currentUser && forumToast.id.startsWith('notif_')) {
                  await markNotificationAsRead(forumToast.id);
                } else {
                  localStorage.setItem(`seen_guest_forum_${forumToast.id}`, 'true');
                }
                setForumToast(null);
                navigate('/forum');
              }}
              className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-lg transition-colors shadow"
            >
              View
            </button>
            <button
              onClick={async () => {
                if (currentUser && forumToast.id.startsWith('notif_')) {
                  await markNotificationAsRead(forumToast.id);
                } else {
                  localStorage.setItem(`seen_guest_forum_${forumToast.id}`, 'true');
                }
                setForumToast(null);
              }}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {messageToast && (
        <button onClick={() => { navigate(`/messages/${messageToast.handle}`); setMessageToast(null); }} className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-3 rounded-xl bg-white dark:bg-zinc-900 border border-pink-200 dark:border-pink-800 px-4 py-3 shadow-2xl animate-in slide-in-from-top-8">
          <img src={messageToast.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
          <span className="text-left"><strong className="block">{messageToast.username}</strong><span className="text-sm text-zinc-500">New messages was sent</span></span>
        </button>
      )}
      
      {/* Mobile Bottom Nav */}
      {!isIntro && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around p-2 z-40">
          <Link to="/" onClick={(e) => handleNavClick(e, '/')} className="p-2">
            <Home size={22} className={location.pathname === '/' ? 'text-pink-600 fill-current' : 'text-zinc-500'} />
          </Link>
          <Link to="/explore" onClick={(e) => handleNavClick(e, '/explore')} className="p-2">
            <Compass size={22} className={location.pathname === '/explore' ? 'text-pink-600 fill-current' : 'text-zinc-500'} />
          </Link>
          <Link to="/upload" onClick={(e) => handleNavClick(e, '/upload')} className="p-1">
            <div className="w-10 h-7 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 p-[2px] flex items-center justify-center">
              <div className="bg-white dark:bg-zinc-950 w-full h-full rounded-[9px] flex items-center justify-center">
                <PlusSquare size={18} className="text-zinc-900 dark:text-white" />
              </div>
            </div>
          </Link>
          <Link to="/messages" onClick={(e) => handleNavClick(e, '/messages')} className="p-2 relative">
            <MessageSquare size={22} className={location.pathname === '/messages' ? 'text-pink-600 fill-current' : 'text-zinc-500'} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-pink-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link to="/forum" onClick={(e) => handleNavClick(e, '/forum')} className="p-2">
            <HelpCircle size={22} className={location.pathname === '/forum' ? 'text-pink-600 fill-current' : 'text-zinc-500'} />
          </Link>
          <Link to={currentUser ? `/profile/${currentUser.handle}` : '#'} onClick={(e) => handleNavClick(e, currentUser ? `/profile/${currentUser.handle}` : '#')} className="p-2">
            <User size={22} className={location.pathname.startsWith('/profile') ? 'text-pink-600 fill-current' : 'text-zinc-500'} />
          </Link>
        </div>
      )}
      
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      
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
