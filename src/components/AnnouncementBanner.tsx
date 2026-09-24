import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Announcement } from '../types';
import { subscribeToAnnouncements, voteInPoll } from '../lib/db';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

const AnnouncementBanner: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const location = useLocation();
  const { currentUser, activeGameTitle } = useAppStore();
  const [timedOut, setTimedOut] = useState<string[]>([]);
  const [manuallyDismissed, setManuallyDismissed] = useState<string[]>([]);

  useEffect(() => {
    const unsub = subscribeToAnnouncements((data) => {
      // Filter active and non-expired announcements
      const active = data.filter(a => {
        if (!a.active) return false;
        if (a.expiresAt && a.expiresAt < Date.now()) return false;
        if (a.scheduledAt && a.scheduledAt > Date.now()) return false;
        
        // Hide during gameplay logic
        if (a.hideDuringGameplay && activeGameTitle) return false;
        
        // Targeting logic
        if (a.type === 'global') return true;
        
        if (a.type === 'page' && a.targetPage) {
          const currentPath = location.pathname;
          const targetPath = a.targetPage;
          // Alias /games to /games-apps, and /home to /
          if (targetPath === '/games' && currentPath === '/games-apps') return true;
          if ((targetPath === '/home' || targetPath === '/') && (currentPath === '/' || currentPath === '/home')) return true;
          return currentPath === targetPath;
        }
        
        if (a.type === 'game' && a.targetGameIds && activeGameTitle) {
          return a.targetGameIds.includes(activeGameTitle);
        }
        
        return false;
      });
      setAnnouncements(active);
    });
    return () => unsub();
  }, [location.pathname, activeGameTitle]);

  // Handle auto-disappear timers
  useEffect(() => {
    announcements.forEach(a => {
      if (a.displayDuration && a.displayDuration > 0 && !timedOut.includes(a.id)) {
        const timer = setTimeout(() => {
          setTimedOut(prev => [...prev, a.id]);
        }, a.displayDuration * 1000);
        return () => clearTimeout(timer);
      }
    });
  }, [announcements, timedOut]);

  // Clear timedOut if an announcement is removed from the active list (e.g. page change)
  useEffect(() => {
    setTimedOut(prev => prev.filter(id => announcements.some(a => a.id === id)));
  }, [announcements]);

  const activeAnnouncements = announcements.filter(a => !timedOut.includes(a.id) && !manuallyDismissed.includes(a.id));

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[2100] flex flex-col gap-2 pointer-events-none p-4">
      <AnimatePresence>
        {activeAnnouncements.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`pointer-events-auto relative w-full max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden border flex items-center gap-4 transition-all
              ${a.size === 'sm' ? 'p-3 text-sm' : a.size === 'md' ? 'p-4 text-base' : 'p-6 text-lg'}
              ${a.color.startsWith('bg-') ? a.color : 'bg-pink-600'} 
              ${a.color.includes('text-') ? '' : 'text-white'}
              ${a.color.includes('border-') ? '' : 'border-white/20'}
            `}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              {a.type === 'game' ? <Sparkles size={20} /> : <Megaphone size={20} />}
            </div>
            
            <div className="flex-grow font-bold tracking-tight leading-snug">
              <div>{a.text}</div>
              
              {/* Poll UI */}
              {a.isPoll && a.pollOptions && (
                <div className="mt-4 space-y-2 max-w-sm">
                  {a.pollOptions.map((option, idx) => {
                    const votes = a.pollVotes || {};
                    const totalVotes = Object.keys(votes).length;
                    const optionVotes = Object.values(votes).filter(v => v === idx).length;
                    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                    const hasVoted = currentUser ? votes[currentUser.id] !== undefined : false;
                    const isSelected = currentUser ? votes[currentUser.id] === idx : false;

                    return (
                      <button
                        key={idx}
                        disabled={hasVoted}
                        onClick={() => currentUser && voteInPoll(a.id, currentUser.id, idx)}
                        className={`w-full relative h-10 rounded-lg overflow-hidden border transition-all ${
                          isSelected ? 'border-white bg-white/30' : 'border-white/20 bg-white/10 hover:bg-white/20'
                        } ${hasVoted ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {hasVoted && (
                          <div 
                            className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-black uppercase italic">
                          <span>{option}</span>
                          {hasVoted && <span>{percentage}%</span>}
                        </div>
                      </button>
                    );
                  })}
                  {!currentUser && (
                    <p className="text-[10px] opacity-70 italic">Please login to vote</p>
                  )}
                </div>
              )}

              {/* Action Button */}
              {a.actionButtonText && a.actionButtonLink && (
                <div className="mt-4">
                  {a.actionButtonLink.startsWith('/') ? (
                    <Link
                      to={a.actionButtonLink}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-white text-pink-600 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      {a.actionButtonText}
                    </Link>
                  ) : (
                    <a
                      href={a.actionButtonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2 bg-white text-pink-600 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      {a.actionButtonText}
                    </a>
                  )}
                </div>
              )}
            </div>

            {a.allowDismiss !== false ? (
              <button 
                onClick={() => setManuallyDismissed(prev => [...prev, a.id])}
                className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            ) : (
              <div className="flex-shrink-0 w-8" /> 
            )}            
            {/* Subtle glow effect for large announcements */}
            {a.size === 'lg' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementBanner;
