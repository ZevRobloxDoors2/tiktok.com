import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Sparkles, X, ArrowRight, ShieldCheck, Flame, Compass } from 'lucide-react';

interface ForumChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForumChooserModal({ isOpen, onClose }: ForumChooserModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      <div 
        id="forum-chooser-backdrop" 
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div
          id="forum-chooser-card"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-zinc-950 text-white rounded-3xl border border-zinc-800 p-6 md:p-8 shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Close Button */}
          <button
            id="forum-chooser-close-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="text-center max-w-md mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3">
              <Compass size={14} className="text-pink-500" />
              <span>CentralTok Forums</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              What would you like to see?
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-2">
              Choose between official platform announcements or exclusive sneak peeks of upcoming features.
            </p>
          </div>

          {/* Two Distinct Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Option 1: Updates & Announcements */}
            <div
              id="forum-chooser-updates-option"
              onClick={() => handleSelect('/forum/updates')}
              className="group relative flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 hover:from-blue-950/40 hover:to-zinc-900/80 border border-zinc-800 hover:border-blue-500/60 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <Megaphone size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">
                    Official
                  </span>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">
                  Updates & Announcements
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Read official system updates, patch notes, changelogs, moderation rules, and staff FAQ guides.
                </p>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-blue-400 shrink-0" />
                    <span>V0.9 BETA Notes & Verification</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-blue-400 shrink-0" />
                    <span>Staff Transparency & Rules</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-blue-400 group-hover:text-blue-300">
                <span>Enter Announcements</span>
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Option 2: Sneak Peeks */}
            <div
              id="forum-chooser-sneak-peeks-option"
              onClick={() => handleSelect('/forum/sneak-peeks')}
              className="group relative flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 hover:from-pink-950/40 hover:to-zinc-900/80 border border-zinc-800 hover:border-pink-500/60 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-pink-500/10 hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-white transition-all">
                    <Sparkles size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-950/60 text-pink-300 border border-pink-800/40">
                    Exclusive
                  </span>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-pink-400 transition-colors">
                  Sneak Peeks
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Get first looks at upcoming unreleased features, live concept previews, dev roadmaps, and hype meters.
                </p>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Flame size={12} className="text-pink-400 shrink-0" />
                    <span>Unreleased V1.0 Tools & Teasers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame size={12} className="text-pink-400 shrink-0" />
                    <span>Community Hype & Feature Votes</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-pink-400 group-hover:text-pink-300">
                <span>Enter Sneak Peeks</span>
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Quick Footer hint */}
          <div className="mt-6 text-center text-[11px] text-zinc-500">
            You can easily switch between both sections at any time while browsing!
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
