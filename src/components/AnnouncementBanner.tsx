import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Announcement } from '../types';
import { subscribeToAnnouncements } from '../lib/db';
import { useAppStore } from '../store';

const AnnouncementBanner: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const location = useLocation();
  const { activeGameTitle } = useAppStore();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const unsub = subscribeToAnnouncements((data) => {
      // Filter active and non-expired announcements
      const active = data.filter(a => {
        if (!a.active) return false;
        if (a.expiresAt && a.expiresAt < Date.now()) return false;
        
        // Targeting logic
        if (a.type === 'global') return true;
        
        if (a.type === 'page' && a.targetPage) {
          // sidebar specific page check
          return location.pathname === a.targetPage;
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

  const activeAnnouncements = announcements;

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
              {a.text}
            </div>

            <div className="flex-shrink-0 w-8" /> 
            
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
